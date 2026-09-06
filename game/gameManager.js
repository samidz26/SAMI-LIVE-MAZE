const {
    createMaze,
    MAZE_SIZE
} = require("./maze");

const {
    getPlayers,
    getPlayersArray,
    getPlayer,
    addPlayer,
    removePlayer,
    clearPlayers,
    getPlayerCount,
    registerPlayer
} = require("./players");

const { movePlayer } = require("./movement");

const {
    createTreasureManager
} = require("./treasure");

const {
    createMonsterManager
} = require("./monsters");

const {
    createChaseManager
} = require("./chase");

const {
    createNahroushManager
} = require("./nahroush");


function createGameManager(options = {}) {

    const {
        io,
        settings = {}
    } = options;


    /* =========================================
       SETTINGS
    ========================================= */

    const PORT =
        settings.server?.port ||
        process.env.PORT ||
        3000;

    const MAX_PLAYERS =
        settings.players?.maxPlayers ?? 20;

    const JOIN_KEYWORD =
        settings.players?.joinKeyword || "JOIN";

    const TREASURE_DURATION =
        settings.treasure?.duration ?? 10;

    const ROUND_DURATION =
        settings.game?.roundDuration ?? 60;

    const MONSTER_COUNT =
        settings.monsters?.count ?? 1;

    const MONSTER_SPEED =
        settings.monsters?.speed ?? 1000;

    const NAHROUSH_USERNAME =
        settings.nahroush?.username || "jordan_river13";


    /* =========================================
       GAME STATE
    ========================================= */

    let registrationOpen = true;

    let joinKeyword = JOIN_KEYWORD;

    let maxPlayers = MAX_PLAYERS;

    let gameMode =
        settings.game?.defaultMode ||
        "treasure";

    let gameStarted = false;

    let gameWinner = null;

    let gameResult = null;

    let maze = [];

    let roundTimeLeft = ROUND_DURATION;

    let treasureTimeLeft = TREASURE_DURATION;


    /* =========================================
       TIMERS
    ========================================= */

    let roundTimer = null;


    /* =========================================
       TIKTOK STATE
    ========================================= */

    let connectedUsername = "";

    const avatarCache = new Map();


    /* =========================================
       HELPERS
    ========================================= */

    function broadcastState() {

        if (!io) return;

        io.emit("game_state", getGameState());
    }


    function getGameState() {

        return {

            maze,

            mazeSize: MAZE_SIZE,

            players: getPlayersArray(),

            treasure:
                treasureManager.getTreasure(),

            treasureTimeLeft:
                treasureManager.getTreasureTimeLeft(),

            monsters:
                monsterManager.getMonsters(),

            gameStarted,

            gameMode,

            registrationOpen,

            joinKeyword,

            maxPlayers,

            roundTimeLeft,

            gameWinner,

            gameResult,

            connectedUsername,

            nahroushUsername:
                NAHROUSH_USERNAME,

            nahroushCaught:
                nahroushManager.isCaught(),

            nahroushRunning:
                nahroushManager.isRunning()
        };
    }


    function clearRoundTimer() {

        if (roundTimer) {

            clearInterval(roundTimer);

            roundTimer = null;
        }
    }


    function clearAllTimers() {

        clearRoundTimer();

        treasureManager.clearTreasureTimer();

        monsterManager.clearMonsterTimer();

        chaseManager.clearTimer();
    }


    /* =========================================
       TREASURE
    ========================================= */

    const treasureManager =
        createTreasureManager({

            mazeSize: MAZE_SIZE,

            getMaze: () => maze,

            getPlayers,

            getGameState,

            broadcastState,

            duration: TREASURE_DURATION,

            onWinner: player => {

                finishTreasureGame(player);
            }
        });


    /* =========================================
       MONSTERS
    ========================================= */

    const monsterManager =
        createMonsterManager({

            mazeSize: MAZE_SIZE,

            getMaze: () => maze,

            getPlayers,

            broadcastState,

            onCatchPlayer: player => {

                if (player) {

                    player.alive = false;

                    player.caught = true;
                }

                broadcastState();
            }
        });


    /* =========================================
       CHASE
    ========================================= */

    const chaseManager =
        createChaseManager({

            getPlayers,

            broadcastState,

            roundDuration: ROUND_DURATION,

            onEnd: result => {

                endChaseGame(result);
            }
        });


    /* =========================================
       NAHROUSH
    ========================================= */

    const nahroushManager =
        createNahroushManager({

            getPlayers,

            broadcastState,

            username: NAHROUSH_USERNAME,

            onNahroushCaught: player => {

                endNahroushGame(
                    "players_win",
                    player
                );
            },

            onPlayerCaught: player => {

                if (player) {

                    player.alive = false;

                    player.caught = true;
                }

                broadcastState();
            }
        });


    /* =========================================
       TREASURE GAME
    ========================================= */

    function finishTreasureGame(player) {

        if (!gameStarted) return;

        gameWinner = player;

        gameResult = {

            type: "treasure",

            winner: player
        };

        gameStarted = false;

        registrationOpen = false;

        clearAllTimers();

        if (io) {

            io.emit("game_finished", {

                type: "treasure",

                winner: player
            });
        }

        broadcastState();
    }


    /* =========================================
       CHASE GAME
    ========================================= */

    function startRoundCountdown() {

        clearRoundTimer();

        roundTimeLeft =
            ROUND_DURATION;

        roundTimer =
            setInterval(() => {

                if (!gameStarted) {

                    clearRoundTimer();

                    return;
                }

                roundTimeLeft--;

                broadcastState();

                if (roundTimeLeft <= 0) {

                    clearRoundTimer();

                    endChaseGame({

                        type: "time",

                        winner: null
                    });
                }

            }, 1000);
    }


    function endChaseGame(result = {}) {

        if (!gameStarted) return;

        gameStarted = false;

        gameResult = result;

        clearAllTimers();

        if (io) {

            io.emit("game_finished", {

                type: "chase",

                result
            });
        }

        broadcastState();
    }


    /* =========================================
       NAHROUSH GAME
    ========================================= */

    function endNahroushGame(
        resultType,
        winner = null
    ) {

        if (!gameStarted) return;

        gameStarted = false;

        gameWinner = winner;

        gameResult = {

            type: resultType,

            winner
        };

        clearAllTimers();

        if (io) {

            io.emit("game_finished", {

                type: "nahroush",

                result: gameResult
            });
        }

        broadcastState();
    }


    /* =========================================
       START GAME
    ========================================= */

    function startGame() {

        if (gameStarted) return false;

        if (getPlayerCount() === 0) {

            if (io) {

                io.emit(
                    "game_error",
                    {
                        message:
                            "لا يوجد لاعبين"
                    }
                );
            }

            return false;
        }


        clearAllTimers();


        maze = createMaze();


        gameWinner = null;

        gameResult = null;

        roundTimeLeft =
            ROUND_DURATION;

        treasureTimeLeft =
            TREASURE_DURATION;


        gameStarted = true;

        registrationOpen = false;


        /* =====================================
           RESET PLAYERS
        ===================================== */

        for (
            const player
            of getPlayers().values()
        ) {

            player.x = null;

            player.y = null;

            player.alive = true;

            player.caught = false;
        }


        /* =====================================
           NAHROUSH MODE
        ===================================== */

        if (
            gameMode ===
            "nahroush"
        ) {

            const result =
                nahroushManager.start({

                    maze,

                    mazeSize: MAZE_SIZE
                });


            if (!result) {

                gameStarted = false;

                registrationOpen = true;

                return false;
            }

            if (io) {

                io.emit(
                    "game_started",
                    {
                        mode:
                            gameMode
                    }
                );
            }

            broadcastState();

            return true;
        }


        /* =====================================
           NORMAL PLAYER SPAWN
        ===================================== */

        const playersArray =
            Array.from(
                getPlayers().values()
            );


        for (
            const player
            of playersArray
        ) {

            const cell =
                getRandomEdgeCell();

            if (cell) {

                player.x = cell.x;

                player.y = cell.y;
            }
        }


        /* =====================================
           TREASURE MODE
        ===================================== */

        if (
            gameMode ===
            "treasure"
        ) {

            treasureManager
                .spawnTreasure(true);
        }


        /* =====================================
           CHASE MODE
        ===================================== */

        if (
            gameMode ===
            "chase"
        ) {

            monsterManager
                .spawnMonsters(
                    MONSTER_COUNT
                );

            startRoundCountdown();

            monsterManager
                .startAI(
                    MONSTER_SPEED
                );
        }


        if (io) {

            io.emit(
                "game_started",
                {
                    mode:
                        gameMode
                }
            );
        }


        broadcastState();

        return true;
    }


    /* =========================================
       EDGE CELL
    ========================================= */

    function getRandomEdgeCell() {

        if (!maze?.length) return null;

        const cells = [];

        for (
            let y = 0;
            y < MAZE_SIZE;
            y++
        ) {

            for (
                let x = 0;
                x < MAZE_SIZE;
                x++
            ) {

                if (
                    x === 0 ||
                    y === 0 ||
                    x === MAZE_SIZE - 1 ||
                    y === MAZE_SIZE - 1
                ) {

                    cells.push({
                        x,
                        y
                    });
                }
            }
        }

        if (!cells.length)
            return null;

        return cells[
            Math.floor(
                Math.random() *
                cells.length
            )
        ];
    }


    /* =========================================
       MOVEMENT
    ========================================= */

    function handleMovement(
        uniqueId,
        direction
    ) {

        movePlayer(
            uniqueId,
            direction,
            {

                players:
                    getPlayers(),

                maze,

                mazeSize:
                    MAZE_SIZE,

                gameStarted,

                broadcastState,

                onTreasureReached:
                    player => {

                        treasureManager
                            .checkTreasure(
                                player
                            );
                    },

                onMonsterCollision:
                    player => {

                        monsterManager
                            .checkCollision(
                                player
                            );

                        nahroushManager
                            .checkCollision(
                                player
                            );
                    }
            }
        );
    }


    /* =========================================
       RESET GAME
    ========================================= */

    function resetGame() {

        clearAllTimers();

        gameStarted = false;

        registrationOpen = true;

        gameWinner = null;

        gameResult = null;

        maze = [];

        roundTimeLeft =
            ROUND_DURATION;

        treasureTimeLeft =
            TREASURE_DURATION;


        treasureManager
            .resetTreasure();

        monsterManager
            .clearMonsters();

        chaseManager
            .reset();

        nahroushManager
            .reset();


        for (
            const player
            of getPlayers().values()
        ) {

            player.x = null;

            player.y = null;

            player.alive = true;

            player.caught = false;
        }


        broadcastState();
    }


    /* =========================================
       REMOVE PLAYER
    ========================================= */

    function removePlayerFromGame(
        uniqueId
    ) {

        removePlayer(uniqueId);

        broadcastState();
    }


    /* =========================================
       SOCKET EVENTS
    ========================================= */

    function setupSocketEvents() {

        if (!io) return;


        io.on(
            "connection",
            socket => {

                socket.emit(
                    "game_state",
                    getGameState()
                );


                socket.on(
                    "start_game",
                    () => {

                        startGame();
                    }
                );


                socket.on(
                    "reset_game",
                    () => {

                        resetGame();
                    }
                );


                socket.on(
                    "move",
                    data => {

                        if (!data) return;

                        handleMovement(
                            data.uniqueId ||
                            data.playerId,
                            data.direction ||
                            data.command
                        );
                    }
                );


                socket.on(
                    "remove_player",
                    data => {

                        if (!data) return;

                        removePlayerFromGame(
                            data.uniqueId ||
                            data.playerId
                        );
                    }
                );


                socket.on(
                    "set_game_mode",
                    data => {

                        if (
                            gameStarted
                        ) return;

                        if (
                            !data?.mode
                        ) return;

                        gameMode =
                            data.mode;

                        broadcastState();
                    }
                );


                socket.on(
                    "set_join_keyword",
                    data => {

                        if (
                            gameStarted
                        ) return;

                        if (
                            typeof data?.keyword !==
                            "string"
                        ) return;

                        joinKeyword =
                            data.keyword.trim() ||
                            JOIN_KEYWORD;

                        broadcastState();
                    }
                );


                socket.on(
                    "set_registration",
                    data => {

                        if (
                            gameStarted
                        ) return;

                        if (
                            typeof data?.open ===
                            "boolean"
                        ) {

                            registrationOpen =
                                data.open;

                            broadcastState();
                        }
                    }
                );


                socket.on(
                    "set_max_players",
                    data => {

                        if (
                            gameStarted
                        ) return;

                        const value =
                            Number(
                                data?.maxPlayers
                            );

                        if (
                            Number.isFinite(value) &&
                            value > 0
                        ) {

                            maxPlayers =
                                Math.floor(value);

                            broadcastState();
                        }
                    }
                );


                socket.on(
                    "register_player",
                    user => {

                        registerPlayer(
                            user,
                            {

                                gameStarted,

                                registrationOpen,

                                maxPlayers,

                                nahroushUsername:
                                    NAHROUSH_USERNAME,

                                avatarCache,

                                io,

                                broadcastState
                            }
                        );
                    }
                );


                socket.on(
                    "disconnect",
                    () => {

                        console.log(
                            `[SOCKET] disconnected: ${socket.id}`
                        );
                    }
                );
            }
        );
    }


    /* =========================================
       PUBLIC API
    ========================================= */

    function setup() {

        setupSocketEvents();

        console.log(
            "[GAME] Game Manager initialized"
        );

        console.log(
            `[GAME] Maze size: ${MAZE_SIZE}x${MAZE_SIZE}`
        );

        console.log(
            `[GAME] Max players: ${maxPlayers}`
        );

        console.log(
            `[GAME] Default mode: ${gameMode}`
        );
    }


    return {

        setup,

        startGame,

        resetGame,

        handleMovement,

        removePlayerFromGame,

        broadcastState,

        getGameState,

        getPlayers,

        getPlayer,

        addPlayer,

        registerPlayer,

        getPlayerCount,

        setConnectedUsername:
            username => {

                connectedUsername =
                    username || "";

                broadcastState();
            },

        getConnectedUsername:
            () =>
                connectedUsername,

        getJoinKeyword:
            () =>
                joinKeyword,

        setJoinKeyword:
            value => {

                joinKeyword =
                    String(
                        value || ""
                    ).trim() ||
                    JOIN_KEYWORD;

                broadcastState();
            },

        isRegistrationOpen:
            () =>
                registrationOpen,

        setRegistrationOpen:
            value => {

                registrationOpen =
                    Boolean(value);

                broadcastState();
            },

        getGameMode:
            () =>
                gameMode,

        setGameMode:
            mode => {

                if (gameStarted)
                    return;

                gameMode =
                    mode || "treasure";

                broadcastState();
            }
    };
}


module.exports = {
    createGameManager
};
