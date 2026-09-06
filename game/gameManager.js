const {
    createMaze,
    MAZE_SIZE
} = require("./maze");

const {
    getPlayers,
    getPlayersArray,
    getPlayer,
    removePlayer,
    clearPlayers,
    registerPlayer
} = require("./players");

const {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} = require("tiktok-live-connector");


function createGameManager({ io, settings }) {

    /* =====================================================
       SETTINGS
    ===================================================== */

    const DEFAULT_MAX_PLAYERS =
        settings.players.maxPlayers;

    const DEFAULT_JOIN_KEYWORD =
        settings.players.joinKeyword;

    const DEFAULT_TREASURE_DURATION =
        settings.treasure.duration;

    const DEFAULT_ROUND_DURATION =
        settings.game.roundDuration;

    const DEFAULT_MONSTER_COUNT =
        settings.monsters.count;

    const DEFAULT_MONSTER_SPEED =
        settings.monsters.speed;

    const DEFAULT_NAHROUSH_USERNAME =
        settings.nahroush.username;


    /* =====================================================
       TIKTOK
    ===================================================== */

    let tiktokLiveConnection = null;
    let connectedUsername = "";

    const avatarCache = new Map();


    /* =====================================================
       GAME STATE
    ===================================================== */

    let registrationOpen = true;

    let joinKeyword =
        DEFAULT_JOIN_KEYWORD;

    let maxPlayers =
        DEFAULT_MAX_PLAYERS;

    let gameMode =
        settings.game.defaultMode;

    let gameStarted = false;

    let gameWinner = null;

    let gameResult = null;

    const players = getPlayers();

    let maze = [];

    let treasure = null;

    let treasureTimer = null;

    let roundTimer = null;

    let monsterTimer = null;

    let roundTimeLeft =
        DEFAULT_ROUND_DURATION;

    let treasureTimeLeft =
        DEFAULT_TREASURE_DURATION;

    let monsters = [];


    /* =====================================================
       NAHROUSH
    ===================================================== */

    let nahroushUsername =
        DEFAULT_NAHROUSH_USERNAME;

    let nahroushCaught = false;


    /* =====================================================
       MODE SETTINGS
    ===================================================== */

    let treasureSettings = {
        duration:
            DEFAULT_TREASURE_DURATION
    };

    let chaseSettings = {
        roundDuration:
            DEFAULT_ROUND_DURATION,

        monsterCount:
            DEFAULT_MONSTER_COUNT,

        monsterSpeed:
            DEFAULT_MONSTER_SPEED
    };


    /* =====================================================
       AVATAR
    ===================================================== */

    function extractAvatar(data) {

        const user =
            data?.user || {};

        const sources = [
            user.profilePictureUrl,
            user.avatarThumb,
            user.avatarMedium,
            user.avatarLarge,
            user.avatarJpg,

            data?.profilePictureUrl,
            data?.avatarThumb,
            data?.avatarMedium,
            data?.avatarLarge
        ];


        for (const source of sources) {

            if (!source) {
                continue;
            }


            if (
                typeof source === "string" &&
                source.trim() !== ""
            ) {
                return source;
            }


            if (
                typeof source === "object"
            ) {

                if (
                    Array.isArray(source.urlList)
                ) {

                    const url =
                        source.urlList.find(
                            item =>
                                typeof item === "string" &&
                                item.startsWith("http")
                        );

                    if (url) {
                        return url;
                    }
                }


                if (
                    Array.isArray(source.urls)
                ) {

                    const url =
                        source.urls.find(
                            item =>
                                typeof item === "string" &&
                                item.startsWith("http")
                        );

                    if (url) {
                        return url;
                    }
                }


                if (
                    typeof source.url === "string" &&
                    source.url.startsWith("http")
                ) {
                    return source.url;
                }
            }
        }


        return "";
    }


    /* =====================================================
       GAME STATE
    ===================================================== */

    function getGameState() {

        return {

            maze,

            treasure,

            players:
                getPlayersArray(),

            monsters,

            gameStarted,

            gameWinner,

            gameResult,

            registrationOpen,

            joinKeyword,

            maxPlayers,

            gameMode,

            connectedUsername,

            treasureTimeLeft,

            roundTimeLeft,

            treasureSettings,

            chaseSettings,

            nahroushUsername,

            nahroushCaught
        };
    }


    /* =====================================================
       BROADCAST
    ===================================================== */

    function broadcastState() {

        /*
         * DEBUG
         * سنستخدمه الآن لمعرفة هل المتاهة
         * تصل إلى Socket.IO أم لا.
         */

        console.log(
            "[MAZE DEBUG]",
            "started:",
            gameStarted,
            "mode:",
            gameMode,
            "rows:",
            Array.isArray(maze)
                ? maze.length
                : "NOT_ARRAY",
            "cols:",
            Array.isArray(maze) &&
            maze[0]
                ? maze[0].length
                : 0
        );


        io.emit(
            "game_state",
            getGameState()
        );
    }


    /* =====================================================
       FREE CELL
    ===================================================== */

    function isCellOccupied(x, y) {

        return Array.from(
            players.values()
        ).some(
            player =>
                player.x === x &&
                player.y === y &&
                player.alive !== false
        );
    }


    /* =====================================================
       EDGE CELL
    ===================================================== */

    function getRandomEdgeCell() {

        const candidates = [];


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

                const isEdge =
                    x === 0 ||
                    y === 0 ||
                    x === MAZE_SIZE - 1 ||
                    y === MAZE_SIZE - 1;


                if (!isEdge) {
                    continue;
                }


                if (
                    isCellOccupied(x, y)
                ) {
                    continue;
                }


                candidates.push({
                    x,
                    y
                });
            }
        }


        if (
            candidates.length === 0
        ) {

            return {

                x:
                    Math.floor(
                        Math.random() *
                        MAZE_SIZE
                    ),

                y:
                    Math.floor(
                        Math.random() *
                        MAZE_SIZE
                    )
            };
        }


        return candidates[
            Math.floor(
                Math.random() *
                candidates.length
            )
        ];
    }


    /* =====================================================
       CENTER
    ===================================================== */

    function getCenterCell() {

        const center =
            Math.floor(
                MAZE_SIZE / 2
            );


        return {
            x: center,
            y: center
        };
    }


    /* =====================================================
       RANDOM FREE CELL
    ===================================================== */

    function getRandomFreeCell(
        avoidCenter = false
    ) {

        const candidates = [];


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
                    avoidCenter &&
                    x === Math.floor(
                        MAZE_SIZE / 2
                    ) &&
                    y === Math.floor(
                        MAZE_SIZE / 2
                    )
                ) {
                    continue;
                }


                if (
                    isCellOccupied(x, y)
                ) {
                    continue;
                }


                if (
                    monsters.some(
                        monster =>
                            monster.x === x &&
                            monster.y === y
                    )
                ) {
                    continue;
                }


                candidates.push({
                    x,
                    y
                });
            }
        }


        if (
            candidates.length === 0
        ) {

            return getCenterCell();
        }


        return candidates[
            Math.floor(
                Math.random() *
                candidates.length
            )
        ];
    }


    /* =====================================================
       CLEAR TIMERS
    ===================================================== */

    function clearGameTimers() {

        if (treasureTimer) {

            clearInterval(
                treasureTimer
            );

            treasureTimer = null;
        }


        if (roundTimer) {

            clearInterval(
                roundTimer
            );

            roundTimer = null;
        }


        if (monsterTimer) {

            clearInterval(
                monsterTimer
            );

            monsterTimer = null;
        }
    }


    /* =====================================================
       START GAME
    ===================================================== */

    function startGame() {

        if (gameStarted) {

            return {
                success: false,
                message:
                    "اللعبة بدأت بالفعل"
            };
        }


        if (players.size === 0) {

            return {
                success: false,
                message:
                    "يجب تسجيل لاعب واحد على الأقل"
            };
        }


        clearGameTimers();


        /*
         * IMPORTANT
         * إنشاء المتاهة يبقى كما هو.
         */

        maze = createMaze();


        /* DEBUG */

        console.log(
            "[MAZE CREATED]",
            {
                isArray:
                    Array.isArray(maze),

                rows:
                    Array.isArray(maze)
                        ? maze.length
                        : 0,

                cols:
                    Array.isArray(maze) &&
                    maze[0]
                        ? maze[0].length
                        : 0,

                size:
                    MAZE_SIZE
            }
        );


        treasure = null;

        monsters = [];

        gameWinner = null;

        gameResult = null;

        nahroushCaught = false;

        gameStarted = true;

        registrationOpen = false;


        const normalPlayers =
            Array.from(
                players.values()
            ).filter(
                player =>
                    !player.isNahroush
            );


        const nahroush =
            Array.from(
                players.values()
            ).find(
                player =>
                    player.isNahroush
            );


        for (
            const player of players.values()
        ) {

            player.alive = true;

            player.caught = false;

            player.x = null;

            player.y = null;
        }


        /* =================================================
           NAHROUSH
        ================================================= */

        if (
            gameMode === "nahroush"
        ) {

            if (nahroush) {

                const center =
                    getCenterCell();


                nahroush.x =
                    center.x;

                nahroush.y =
                    center.y;

                nahroush.alive = true;
            }


            for (
                const player of normalPlayers
            ) {

                const position =
                    getRandomEdgeCell();


                player.x =
                    position.x;

                player.y =
                    position.y;
            }


            spawnNahroushMonster();


            /*
             * إرسال game_started
             * بعد اكتمال كل شيء.
             */

            io.emit(
                "game_started",
                getGameState()
            );


            broadcastState();


            if (!nahroush) {

                endNahroushGame(
                    "monsters"
                );

            } else {

                startMonsterAI();
            }


            return {
                success: true
            };
        }


        /* =================================================
           NORMAL MODES
        ================================================= */

        for (
            const player of players.values()
        ) {

            const position =
                getRandomEdgeCell();


            player.x =
                position.x;

            player.y =
                position.y;
        }


        /* =================================================
           TREASURE
        ================================================= */

        if (
            gameMode === "treasure"
        ) {

            /*
             * لا نرسل state هنا.
             * سنرسل state مرة واحدة بعد
             * اكتمال startGame.
             */

            spawnTreasure(
                true,
                false
            );
        }


        /* =================================================
           CHASE
        ================================================= */

        else if (
            gameMode === "chase"
        ) {

            spawnMonsters();


            roundTimeLeft =
                chaseSettings.roundDuration;


            startRoundCountdown();

            startMonsterAI();
        }


        /*
         * الحالة النهائية.
         */

        io.emit(
            "game_started",
            getGameState()
        );


        broadcastState();


        return {
            success: true
        };
    }


    /* =====================================================
       TREASURE
    ===================================================== */

    function spawnTreasure(
        firstSpawn = false,
        sendState = true
    ) {

        if (!gameStarted) {
            return;
        }


        if (
            gameMode !== "treasure"
        ) {
            return;
        }


        if (firstSpawn) {

            treasure =
                getCenterCell();

        } else {

            treasure =
                getRandomFreeCell(false);
        }


        treasureTimeLeft =
            treasureSettings.duration;


        if (sendState) {

            broadcastState();
        }


        startTreasureCountdown();
    }


    /* =====================================================
       TREASURE TIMER
    ===================================================== */

    function startTreasureCountdown() {

        if (treasureTimer) {

            clearInterval(
                treasureTimer
            );
        }


        treasureTimer =
            setInterval(
                () => {

                    if (
                        !gameStarted ||
                        gameMode !== "treasure"
                    ) {

                        clearInterval(
                            treasureTimer
                        );

                        treasureTimer = null;

                        return;
                    }


                    treasureTimeLeft--;


                    if (
                        treasureTimeLeft <= 0
                    ) {

                        treasureTimeLeft = 0;

                        treasure = null;


                        broadcastState();


                        setTimeout(
                            () => {

                                if (
                                    gameStarted &&
                                    gameMode ===
                                        "treasure"
                                ) {

                                    spawnTreasure(
                                        false,
                                        true
                                    );
                                }

                            },
                            250
                        );

                    } else {

                        broadcastState();
                    }

                },
                1000
            );
    }


    /* =====================================================
       TREASURE WINNER
    ===================================================== */

    function finishTreasureGame(
        player
    ) {

        if (!gameStarted) {
            return;
        }


        clearGameTimers();


        gameStarted = false;


        gameWinner = {

            uniqueId:
                player.uniqueId,

            nickname:
                player.nickname,

            profilePictureUrl:
                player.profilePictureUrl
        };


        gameResult = {

            winner:
                "player",

            title:
                "🏆 الفائز",

            message:
                player.nickname
        };


        io.emit(
            "game_winner",
            gameWinner
        );


        broadcastState();
    }


    /* =====================================================
       ROUND COUNTDOWN
    ===================================================== */

    function startRoundCountdown() {

        if (roundTimer) {

            clearInterval(
                roundTimer
            );
        }


        roundTimer =
            setInterval(
                () => {

                    if (
                        !gameStarted ||
                        gameMode !== "chase"
                    ) {

                        clearInterval(
                            roundTimer
                        );

                        roundTimer = null;

                        return;
                    }


                    roundTimeLeft--;


                    if (
                        roundTimeLeft <= 0
                    ) {

                        roundTimeLeft = 0;


                        endChaseGame(
                            "players"
                        );


                        return;
                    }


                    broadcastState();

                },
                1000
            );
    }


    /* =====================================================
       MONSTERS
    ===================================================== */

    function spawnMonsters() {

        monsters = [];


        const center =
            getCenterCell();


        for (
            let i = 0;
            i < chaseSettings.monsterCount;
            i++
        ) {

            let position;


            if (i === 0) {

                position = {

                    x:
                        center.x,

                    y:
                        center.y
                };

            } else {

                position =
                    getMonsterSpawnCell();
            }


            monsters.push({

                id:
                    `monster_${Date.now()}_${i}`,

                x:
                    position.x,

                y:
                    position.y,

                targetId:
                    null
            });
        }
    }


    function spawnNahroushMonster() {

        monsters = [];


        const center =
            getCenterCell();


        monsters.push({

            id:
                `nahroush_monster_${Date.now()}`,

            x:
                center.x,

            y:
                center.y,

            targetId:
                null
        });
    }


    function getMonsterSpawnCell() {

        const candidates = [];


        const center =
            getCenterCell();


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
                    x === center.x &&
                    y === center.y
                ) {
                    continue;
                }


                if (
                    monsters.some(
                        monster =>
                            monster.x === x &&
                            monster.y === y
                    )
                ) {
                    continue;
                }


                candidates.push({
                    x,
                    y
                });
            }
        }


        return candidates[
            Math.floor(
                Math.random() *
                candidates.length
            )
        ];
    }


    /* =====================================================
       MONSTER AI
    ===================================================== */

    function startMonsterAI() {

        if (monsterTimer) {

            clearInterval(
                monsterTimer
            );
        }


        monsterTimer =
            setInterval(
                () => {

                    if (!gameStarted) {

                        clearInterval(
                            monsterTimer
                        );

                        monsterTimer = null;

                        return;
                    }


                    if (
                        gameMode !== "chase" &&
                        gameMode !== "nahroush"
                    ) {

                        clearInterval(
                            monsterTimer
                        );

                        monsterTimer = null;

                        return;
                    }


                    moveMonsters();

                },
                Math.max(
                    100,
                    Number(
                        chaseSettings.monsterSpeed
                    )
                )
            );
    }


    /* =====================================================
       FIND NEAREST PLAYER
    ===================================================== */

    function findNearestPlayer(
        monster
    ) {

        let alivePlayers;


        if (
            gameMode === "nahroush"
        ) {

            alivePlayers =
                Array.from(
                    players.values()
                ).filter(
                    player =>
                        player.alive !== false &&
                        player.isNahroush !== true
                );

        } else {

            alivePlayers =
                Array.from(
                    players.values()
                ).filter(
                    player =>
                        player.alive !== false
                );
        }


        if (
            alivePlayers.length === 0
        ) {
            return null;
        }


        let nearest = null;

        let shortestDistance =
            Infinity;


        for (
            const player of alivePlayers
        ) {

            const path =
                findPath(
                    monster.x,
                    monster.y,
                    player.x,
                    player.y
                );


            if (
                path &&
                path.length <
                    shortestDistance
            ) {

                shortestDistance =
                    path.length;

                nearest =
                    player;
            }
        }


        return nearest;
    }


    /* =====================================================
       BFS
    ===================================================== */

    function findPath(
        startX,
        startY,
        targetX,
        targetY
    ) {

        if (
            !maze[startY] ||
            !maze[targetY]
        ) {
            return null;
        }


        const queue = [

            {
                x:
                    startX,

                y:
                    startY,

                path: []
            }

        ];


        const visited =
            new Set();


        visited.add(
            `${startX},${startY}`
        );


        while (
            queue.length > 0
        ) {

            const current =
                queue.shift();


            if (
                current.x === targetX &&
                current.y === targetY
            ) {

                return current.path;
            }


            const cell =
                maze[current.y]?.[
                    current.x
                ];


            if (!cell) {
                continue;
            }


            const directions = [

                {
                    dx: 0,
                    dy: -1,
                    blocked:
                        cell.walls.top
                },

                {
                    dx: 1,
                    dy: 0,
                    blocked:
                        cell.walls.right
                },

                {
                    dx: 0,
                    dy: 1,
                    blocked:
                        cell.walls.bottom
                },

                {
                    dx: -1,
                    dy: 0,
                    blocked:
                        cell.walls.left
                }

            ];


            for (
                const direction of directions
            ) {

                if (
                    direction.blocked
                ) {
                    continue;
                }


                const nx =
                    current.x +
                    direction.dx;

                const ny =
                    current.y +
                    direction.dy;


                if (
                    nx < 0 ||
                    nx >= MAZE_SIZE ||
                    ny < 0 ||
                    ny >= MAZE_SIZE
                ) {
                    continue;
                }


                const key =
                    `${nx},${ny}`;


                if (
                    visited.has(key)
                ) {
                    continue;
                }


                visited.add(key);


                queue.push({

                    x:
                        nx,

                    y:
                        ny,

                    path: [
                        ...current.path,

                        {
                            x:
                                nx,

                            y:
                                ny
                        }
                    ]
                });
            }
        }


        return null;
    }


    /* =====================================================
       MOVE MONSTERS
    ===================================================== */

    function moveMonsters() {

        if (
            gameMode === "nahroush"
        ) {

            moveNahroushMonsters();

            return;
        }


        for (
            const monster of monsters
        ) {

            const target =
                findNearestPlayer(
                    monster
                );


            if (!target) {
                continue;
            }


            monster.targetId =
                target.uniqueId;


            const path =
                findPath(
                    monster.x,
                    monster.y,
                    target.x,
                    target.y
                );


            if (
                !path ||
                path.length === 0
            ) {

                catchPlayersOnMonsterCell(
                    monster
                );

                continue;
            }


            const next =
                path[0];


            monster.x =
                next.x;

            monster.y =
                next.y;


            catchPlayersOnMonsterCell(
                monster
            );
        }


        const alivePlayers =
            Array.from(
                players.values()
            ).filter(
                player =>
                    player.alive !== false
            );


        if (
            alivePlayers.length === 0
        ) {

            endChaseGame(
                "monsters"
            );

            return;
        }


        broadcastState();
    }


    /* =====================================================
       NAHROUSH MOVEMENT
    ===================================================== */

    function moveNahroushMonsters() {

        const normalPlayers =
            Array.from(
                players.values()
            ).filter(
                player =>
                    player.alive !== false &&
                    player.isNahroush !== true
            );


        if (
            normalPlayers.length === 0
        ) {

            endNahroushGame(
                "monsters"
            );

            return;
        }


        for (
            const monster of monsters
        ) {

            const target =
                findNearestPlayer(
                    monster
                );


            if (target) {

                monster.targetId =
                    target.uniqueId;


                const path =
                    findPath(
                        monster.x,
                        monster.y,
                        target.x,
                        target.y
                    );


                if (
                    path &&
                    path.length > 0
                ) {

                    const next =
                        path[0];


                    monster.x =
                        next.x;

                    monster.y =
                        next.y;
                }
            }


            catchPlayersOnMonsterCell(
                monster
            );


            catchNahroushOnMonsterCell(
                monster
            );


            if (!gameStarted) {
                return;
            }
        }


        const remainingPlayers =
            Array.from(
                players.values()
            ).filter(
                player =>
                    player.alive !== false &&
                    player.isNahroush !== true
            );


        if (
            remainingPlayers.length === 0
        ) {

            endNahroushGame(
                "monsters"
            );

            return;
        }


        broadcastState();
    }


    /* =====================================================
       CATCH PLAYER
    ===================================================== */

    function catchPlayersOnMonsterCell(
        monster
    ) {

        for (
            const player of players.values()
        ) {

            if (
                player.alive === false
            ) {
                continue;
            }


            if (
                player.isNahroush
            ) {
                continue;
            }


            if (
                player.x === monster.x &&
                player.y === monster.y
            ) {

                player.alive = false;

                player.caught = true;


                io.emit(
                    "player_caught",
                    {
                        uniqueId:
                            player.uniqueId,

                        nickname:
                            player.nickname,

                        profilePictureUrl:
                            player.profilePictureUrl
                    }
                );


                broadcastState();
            }
        }
    }


    /* =====================================================
       CATCH NAHROUSH
    ===================================================== */

    function catchNahroushOnMonsterCell(
        monster
    ) {

        const nahroush =
            Array.from(
                players.values()
            ).find(
                player =>
                    player.isNahroush
            );


        if (!nahroush) {
            return;
        }


        if (
            nahroush.alive === false
        ) {
            return;
        }


        if (
            nahroush.x === monster.x &&
            nahroush.y === monster.y
        ) {

            nahroush.alive = false;

            nahroushCaught = true;


            io.emit(
                "nahroush_caught",
                {
                    uniqueId:
                        nahroush.uniqueId,

                    nickname:
                        nahroush.nickname,

                    profilePictureUrl:
                        nahroush.profilePictureUrl
                }
            );


            endNahroushGame(
                "players"
            );
        }
    }


    /* =====================================================
       END CHASE
    ===================================================== */

    function endChaseGame(
        winner
    ) {

        if (!gameStarted) {
            return;
        }


        clearGameTimers();

        gameStarted = false;


        if (
            winner === "monsters"
        ) {

            gameResult = {

                winner:
                    "monsters",

                title:
                    "👹 الوحوش تفوز",

                message:
                    "تم الإمساك بجميع اللاعبين"
            };

        } else {

            gameResult = {

                winner:
                    "players",

                title:
                    "🏆 اللاعبون يفوزون",

                message:
                    "انتهى الوقت وبقي لاعب واحد على الأقل"
            };
        }


        io.emit(
            "game_result",
            gameResult
        );


        broadcastState();
    }


    /* =====================================================
       END NAHROUSH
    ===================================================== */

    function endNahroushGame(
        winner
    ) {

        if (!gameStarted) {
            return;
        }


        clearGameTimers();

        gameStarted = false;


        const nahroush =
            Array.from(
                players.values()
            ).find(
                player =>
                    player.isNahroush
            );


        const nahroushData =
            nahroush
                ? {

                    uniqueId:
                        nahroush.uniqueId,

                    nickname:
                        nahroush.nickname,

                    profilePictureUrl:
                        nahroush.profilePictureUrl

                }
                : null;


        if (
            winner === "players"
        ) {

            gameResult = {

                winner:
                    "players",

                title:
                    "🏆 اللاعبون يفوزون",

                message:
                    "تم القبض على نهروش",

                nahroush:
                    nahroushData
            };

        } else {

            gameResult = {

                winner:
                    "nahroush",

                title:
                    "👑 نهروش والوحش يفوزان",

                message:
                    "تم إقصاء جميع اللاعبين",

                nahroush:
                    nahroushData
            };
        }


        io.emit(
            "game_result",
            gameResult
        );


        broadcastState();
    }


    /* =====================================================
       MOVE PLAYER
    ===================================================== */

    function movePlayer(
        uniqueId,
        command
    ) {

        if (!gameStarted) {
            return;
        }


        const player =
            getPlayer(uniqueId);


        if (!player) {
            return;
        }


        if (
            player.alive === false
        ) {
            return;
        }


        const cell =
            maze[player.y]?.[
                player.x
            ];


        if (!cell) {
            return;
        }


        let nx =
            player.x;

        let ny =
            player.y;


        if (
            command === "u" &&
            !cell.walls.top
        ) {

            ny--;

        } else if (
            command === "d" &&
            !cell.walls.bottom
        ) {

            ny++;

        } else if (
            command === "r" &&
            !cell.walls.right
        ) {

            nx++;

        } else if (
            command === "l" &&
            !cell.walls.left
        ) {

            /*
             * نبقي هذا كما هو حاليًا.
             * سنصلحه لاحقًا بعد حل مشكلة المتاهة.
             */

            nx++;

        } else {

            return;
        }


        if (
            nx < 0 ||
            nx >= MAZE_SIZE ||
            ny < 0 ||
            ny >= MAZE_SIZE
        ) {
            return;
        }


        player.x =
            nx;

        player.y =
            ny;


        if (
            gameMode === "treasure" &&
            treasure &&
            player.x === treasure.x &&
            player.y === treasure.y
        ) {

            finishTreasureGame(
                player
            );

            return;
        }


        broadcastState();
    }


    /* =====================================================
       REMOVE PLAYER
    ===================================================== */

    function removePlayerFromGame(
        uniqueId
    ) {

        if (gameStarted) {
            return;
        }


        removePlayer(
            uniqueId
        );


        broadcastState();
    }


    /* =====================================================
       RESET
    ===================================================== */

    function resetGame() {

        clearGameTimers();


        gameStarted = false;

        gameWinner = null;

        gameResult = null;

        maze = [];

        treasure = null;

        monsters = [];

        nahroushCaught = false;


        roundTimeLeft =
            chaseSettings.roundDuration;


        treasureTimeLeft =
            treasureSettings.duration;


        clearPlayers();


        registrationOpen = true;


        broadcastState();
    }


    /* =====================================================
       REGISTRATION
    ===================================================== */

    function setRegistration(
        value
    ) {

        if (gameStarted) {
            return;
        }


        registrationOpen =
            Boolean(value);


        broadcastState();
    }


    function toggleRegistration() {

        if (gameStarted) {
            return;
        }


        registrationOpen =
            !registrationOpen;


        broadcastState();
    }


    function setMaxPlayers(
        value
    ) {

        if (gameStarted) {
            return;
        }


        const number =
            Number(value);


        if (
            Number.isFinite(number) &&
            number >= 1 &&
            number <= 20
        ) {

            maxPlayers =
                Math.floor(number);


            broadcastState();
        }
    }


    /* =====================================================
       JOIN KEYWORD
    ===================================================== */

    function setJoinKeyword(
        keyword
    ) {

        if (gameStarted) {
            return;
        }


        keyword =
            String(keyword || "")
                .trim()
                .toUpperCase();


        if (!keyword) {
            return;
        }


        joinKeyword =
            keyword;


        io.emit(
            "join_keyword_updated",
            joinKeyword
        );


        broadcastState();
    }


    /* =====================================================
       GAME MODE
    ===================================================== */

    function setGameMode(
        mode
    ) {

        if (gameStarted) {
            return;
        }


        if (
            mode !== "treasure" &&
            mode !== "chase" &&
            mode !== "nahroush"
        ) {
            return;
        }


        gameMode =
            mode;


        io.emit(
            "game_mode_updated",
            gameMode
        );


        broadcastState();
    }


    /* =====================================================
       TREASURE SETTINGS
    ===================================================== */

    function setTreasureSettings(
        settingsData
    ) {

        if (gameStarted) {
            return;
        }


        const duration =
            Number(
                settingsData?.duration
            );


        if (
            Number.isFinite(duration) &&
            duration >= 1 &&
            duration <= 300
        ) {

            treasureSettings.duration =
                duration;


            treasureTimeLeft =
                duration;
        }


        broadcastState();
    }


    /* =====================================================
       CHASE SETTINGS
    ===================================================== */

    function setChaseSettings(
        settingsData
    ) {

        if (gameStarted) {
            return;
        }


        const roundDuration =
            Number(
                settingsData?.roundDuration
            );


        const monsterCount =
            Number(
                settingsData?.monsterCount
            );


        const monsterSpeed =
            Number(
                settingsData?.monsterSpeed
            );


        if (
            Number.isFinite(roundDuration) &&
            roundDuration >= 10 &&
            roundDuration <= 3600
        ) {

            chaseSettings.roundDuration =
                roundDuration;
        }


        if (
            Number.isFinite(monsterCount) &&
            monsterCount >= 1 &&
            monsterCount <= 10
        ) {

            chaseSettings.monsterCount =
                Math.floor(
                    monsterCount
                );
        }


        if (
            Number.isFinite(monsterSpeed) &&
            monsterSpeed >= 100 &&
            monsterSpeed <= 10000
        ) {

            chaseSettings.monsterSpeed =
                monsterSpeed;
        }


        roundTimeLeft =
            chaseSettings.roundDuration;


        broadcastState();
    }


    function setRoundDuration(
        value
    ) {

        setChaseSettings({

            roundDuration:
                value,

            monsterCount:
                chaseSettings.monsterCount,

            monsterSpeed:
                chaseSettings.monsterSpeed
        });
    }


    function setMonsterCount(
        value
    ) {

        setChaseSettings({

            roundDuration:
                chaseSettings.roundDuration,

            monsterCount:
                value,

            monsterSpeed:
                chaseSettings.monsterSpeed
        });
    }


    function setMonsterSpeed(
        value
    ) {

        setChaseSettings({

            roundDuration:
                chaseSettings.roundDuration,

            monsterCount:
                chaseSettings.monsterCount,

            monsterSpeed:
                value
        });
    }


    function setTreasureDuration(
        value
    ) {

        setTreasureSettings({
            duration:
                value
        });
    }


    /* =====================================================
       NAHROUSH USERNAME
    ===================================================== */

    function setNahroushUsername(
        value
    ) {

        if (gameStarted) {
            return;
        }


        const username =
            String(value || "")
                .trim()
                .replace(/^@/, "");


        if (!username) {
            return;
        }


        nahroushUsername =
            username;


        for (
            const player of players.values()
        ) {

            const same =
                String(
                    player.uniqueId
                )
                    .trim()
                    .toLowerCase() ===
                username.toLowerCase();


            player.isNahroush =
                same;
        }


        broadcastState();
    }


    /* =====================================================
       TIKTOK CHAT
    ===================================================== */

    function handleTikTokChat(
        data
    ) {

        const rawComment =
            data.comment ||
            data.content ||
            "";


        const comment =
            typeof rawComment === "string"
                ? rawComment
                    .trim()
                    .toLowerCase()
                : "";


        const tikUser =
            data.user || {};


        const uniqueId =
            tikUser.uniqueId ||
            tikUser.displayId ||
            data.uniqueId ||
            "unknown";


        const nickname =
            tikUser.nickname ||
            data.nickname ||
            "مستخدم";


        let avatar =
            extractAvatar(data);


        if (
            !avatar &&
            avatarCache.has(uniqueId)
        ) {

            avatar =
                avatarCache.get(
                    uniqueId
                );
        }


        if (avatar) {

            avatarCache.set(
                uniqueId,
                avatar
            );
        }


        const user = {

            uniqueId,

            nickname,

            profilePictureUrl:
                avatar
        };


        console.log(
            `[CHAT] ${uniqueId} (${nickname}): ${comment}`
        );


        io.emit(
            "tiktok_comment",
            {
                user,
                comment
            }
        );


        if (
            comment ===
            joinKeyword.toLowerCase()
        ) {

            registerPlayer(
                user,
                {

                    gameStarted,

                    registrationOpen,

                    maxPlayers,

                    nahroushUsername,

                    avatarCache,

                    io,

                    broadcastState
                }
            );


            return;
        }


        const movementMap = {

            "u":
                "u",

            "فوق":
                "u",

            "d":
                "d",

            "تحت":
                "d",

            "r":
                "r",

            "يمين":
                "r",

            "l":
                "l",

            "يسار":
                "l"
        };


        const direction =
            movementMap[comment];


        if (direction) {

            movePlayer(
                uniqueId,
                direction
            );
        }
    }


    /* =====================================================
       TIKTOK CONNECTION
    ===================================================== */

    async function connectTikTok(
        username,
        socket
    ) {

        username =
            String(username || "")
                .trim()
                .replace(/^@/, "");


        if (!username) {

            socket.emit(
                "tiktok_connected",
                {

                    success:
                        false,

                    error:
                        "اسم المستخدم غير صحيح"
                }
            );


            return;
        }


        if (
            tiktokLiveConnection
        ) {

            try {

                tiktokLiveConnection
                    .disconnect();

            } catch (error) {

                console.error(
                    "TikTok disconnect error:",
                    error
                );
            }
        }


        connectedUsername =
            username;


        tiktokLiveConnection =
            new TikTokLiveConnection(
                username,
                {

                    processInitialData:
                        true,

                    fetchRoomInfoOnConnect:
                        true
                }
            );


        tiktokLiveConnection
            .connect()
            .then(state => {

                console.log(
                    `Connected to TikTok Live: @${username}, Room ID: ${state.roomId}`
                );


                socket.emit(
                    "tiktok_connected",
                    {

                        success:
                            true,

                        roomInfo:
                            state.roomInfo
                    }
                );


                broadcastState();

            })
            .catch(error => {

                console.error(
                    "Failed to connect to TikTok Live:",
                    error
                );


                socket.emit(
                    "tiktok_connected",
                    {

                        success:
                            false,

                        error:
                            error.message
                    }
                );
            });


        tiktokLiveConnection.on(
            WebcastEvent.CHAT,
            handleTikTokChat
        );


        tiktokLiveConnection.on(
            ControlEvent.ERROR,
            error => {

                console.error(
                    "TikTok Live Error:",
                    error
                );
            }
        );
    }


    /* =====================================================
       SOCKET EVENTS
    ===================================================== */

    function registerSocketEvents() {

        io.on(
            "connection",
            socket => {

                console.log(
                    "Client connected to UI"
                );


                socket.emit(
                    "game_state",
                    getGameState()
                );


                socket.on(
                    "set_registration",
                    setRegistration
                );


                socket.on(
                    "set_max_players",
                    setMaxPlayers
                );


                socket.on(
                    "set_treasure_duration",
                    setTreasureDuration
                );


                socket.on(
                    "set_round_duration",
                    setRoundDuration
                );


                socket.on(
                    "set_monster_count",
                    setMonsterCount
                );


                socket.on(
                    "set_monster_speed",
                    setMonsterSpeed
                );


                socket.on(
                    "set_nahroush_username",
                    setNahroushUsername
                );


                socket.on(
                    "connect_tiktok",
                    username => {

                        connectTikTok(
                            username,
                            socket
                        );
                    }
                );


                socket.on(
                    "remove_player",
                    removePlayerFromGame
                );


                socket.on(
                    "toggle_registration",
                    toggleRegistration
                );


                socket.on(
                    "set_join_keyword",
                    setJoinKeyword
                );


                socket.on(
                    "set_game_mode",
                    setGameMode
                );


                socket.on(
                    "set_treasure_settings",
                    setTreasureSettings
                );


                socket.on(
                    "set_chase_settings",
                    setChaseSettings
                );


                socket.on(
                    "start_game",
                    callback => {

                        const result =
                            startGame();


                        if (
                            !result.success
                        ) {

                            if (
                                typeof callback ===
                                "function"
                            ) {

                                callback({

                                    success:
                                        false,

                                    message:
                                        result.message
                                });
                            }


                            socket.emit(
                                "game_error",
                                result.message
                            );


                            return;
                        }


                        if (
                            typeof callback ===
                            "function"
                        ) {

                            callback({
                                success:
                                    true
                            });
                        }
                    }
                );


                socket.on(
                    "reset_game",
                    resetGame
                );


                socket.on(
                    "disconnect",
                    () => {

                        console.log(
                            "Client disconnected from UI"
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    return {

        getGameState,

        broadcastState,

        startGame,

        resetGame,

        movePlayer,

        removePlayerFromGame,

        setRegistration,

        toggleRegistration,

        setMaxPlayers,

        setJoinKeyword,

        setGameMode,

        setTreasureSettings,

        setChaseSettings,

        setRoundDuration,

        setMonsterCount,

        setMonsterSpeed,

        setTreasureDuration,

        setNahroushUsername,

        handleTikTokChat,

        connectTikTok,

        registerSocketEvents
    };
}


module.exports = {
    createGameManager
};
