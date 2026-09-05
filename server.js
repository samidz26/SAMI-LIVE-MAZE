const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

/* =====================================================
   SETTINGS
===================================================== */

const PORT = process.env.PORT || 3000;

const MAZE_SIZE = 12;
const MAX_PLAYERS = 20;

const DEFAULT_JOIN_KEYWORD = "JOIN";

const DEFAULT_TREASURE_DURATION = 10;
const DEFAULT_ROUND_DURATION = 60;
const DEFAULT_MONSTER_COUNT = 1;
const DEFAULT_MONSTER_SPEED = 1000;

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

let gameMode =
    "treasure";

let gameStarted = false;

let gameWinner = null;

let gameResult = null;

let players =
    new Map();

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

        if (!source) continue;

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
                Array.isArray(
                    source.urlList
                )
            ) {

                const url =
                    source.urlList.find(
                        item =>
                            typeof item === "string" &&
                            item.startsWith("http")
                    );

                if (url) return url;

            }

            if (
                Array.isArray(
                    source.urls
                )
            ) {

                const url =
                    source.urls.find(
                        item =>
                            typeof item === "string" &&
                            item.startsWith("http")
                    );

                if (url) return url;

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
   PLAYER ARRAY
===================================================== */

function getPlayersArray() {

    return Array.from(
        players.values()
    ).map(player => ({

        uniqueId:
            player.uniqueId,

        nickname:
            player.nickname,

        profilePictureUrl:
            player.profilePictureUrl,

        x:
            player.x,

        y:
            player.y,

        alive:
            player.alive !== false,

        caught:
            player.caught === true

    }));

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

        gameMode,

        connectedUsername,

        treasureTimeLeft,

        roundTimeLeft,

        treasureSettings,

        chaseSettings

    };

}

/* =====================================================
   BROADCAST
===================================================== */

function broadcastState() {

    io.emit(
        "game_state",
        getGameState()
    );

}

/* =====================================================
   MAZE GENERATION
===================================================== */

function createMaze() {

    const grid = [];

    for (
        let y = 0;
        y < MAZE_SIZE;
        y++
    ) {

        const row = [];

        for (
            let x = 0;
            x < MAZE_SIZE;
            x++
        ) {

            row.push({

                x,
                y,

                walls: {

                    top: true,
                    right: true,
                    bottom: true,
                    left: true

                },

                visited: false

            });

        }

        grid.push(row);

    }

    const stack = [];

    const startX =
        Math.floor(
            Math.random() *
            MAZE_SIZE
        );

    const startY =
        Math.floor(
            Math.random() *
            MAZE_SIZE
        );

    grid[startY][startX].visited =
        true;

    stack.push(
        grid[startY][startX]
    );

    while (stack.length > 0) {

        const current =
            stack[
                stack.length - 1
            ];

        const neighbors = [];

        const directions = [

            {
                dx: 0,
                dy: -1,
                wall: "top",
                opposite: "bottom"
            },

            {
                dx: 1,
                dy: 0,
                wall: "right",
                opposite: "left"
            },

            {
                dx: 0,
                dy: 1,
                wall: "bottom",
                opposite: "top"
            },

            {
                dx: -1,
                dy: 0,
                wall: "left",
                opposite: "right"
            }

        ];

        for (
            const direction of directions
        ) {

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

            const neighbor =
                grid[ny][nx];

            if (!neighbor.visited) {

                neighbors.push({

                    neighbor,
                    direction

                });

            }

        }

        if (
            neighbors.length === 0
        ) {

            stack.pop();

            continue;

        }

        const chosen =
            neighbors[
                Math.floor(
                    Math.random() *
                    neighbors.length
                )
            ];

        const neighbor =
            chosen.neighbor;

        const direction =
            chosen.direction;

        current.walls[
            direction.wall
        ] = false;

        neighbor.walls[
            direction.opposite
        ] = false;

        neighbor.visited = true;

        stack.push(
            neighbor
        );

    }

    return grid;

}

/* =====================================================
   FREE CELLS
===================================================== */

function isCellOccupied(
    x,
    y
) {

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
   PLAYER SPAWN
   Around the edges
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

            if (!isEdge) continue;

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
   CENTER CELL
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

    if (
        players.size === 0
    ) {

        return {
            success: false,
            message:
                "يجب تسجيل لاعب واحد على الأقل"
        };

    }

    clearGameTimers();

    maze =
        createMaze();

    treasure = null;

    monsters = [];

    gameWinner = null;

    gameResult = null;

    gameStarted = true;

    registrationOpen = false;

    /* =====================================
       PLAYERS ON EDGES
    ====================================== */

    for (
        const player of players.values()
    ) {

        const position =
            getRandomEdgeCell();

        player.x =
            position.x;

        player.y =
            position.y;

        player.alive = true;

        player.caught = false;

    }

    /* =====================================
       TREASURE MODE
    ====================================== */

    if (
        gameMode === "treasure"
    ) {

        spawnTreasure(
            true
        );

    }

    /* =====================================
       CHASE MODE
    ====================================== */

    else if (
        gameMode === "chase"
    ) {

        spawnMonsters();

        roundTimeLeft =
            chaseSettings.roundDuration;

        startRoundCountdown();

        startMonsterAI();

    }

    /* =====================================
       NAHROUSH
    ====================================== */

    else if (
        gameMode === "nahroush"
    ) {

        /*
            Reserved for future mode.
        */

        gameStarted = false;

        registrationOpen = true;

        return {

            success: false,

            message:
                "مود القبض على نهروش سيتم تطويره لاحقًا"

        };

    }

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
   TREASURE SPAWN
===================================================== */

function spawnTreasure(
    firstSpawn = false
) {

    if (!gameStarted) return;

    if (
        gameMode !== "treasure"
    ) return;

    if (firstSpawn) {

        treasure =
            getCenterCell();

    }

    else {

        treasure =
            getRandomFreeCell(
                false
            );

    }

    treasureTimeLeft =
        treasureSettings.duration;

    broadcastState();

    startTreasureCountdown();

}

/* =====================================================
   TREASURE COUNTDOWN
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
                                gameMode === "treasure"
                            ) {

                                spawnTreasure(
                                    false
                                );

                            }

                        },
                        250
                    );

                }

                else {

                    broadcastState();

                }

            },
            1000
        );

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
                x: center.x,
                y: center.y
            };

        }

        else {

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

/* =====================================================
   MONSTER SPAWN
===================================================== */

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

                if (
                    !gameStarted ||
                    gameMode !== "chase"
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
            path.length < shortestDistance
        ) {

            shortestDistance =
                path.length;

            nearest = player;

        }

    }

    return nearest;

}

/* =====================================================
   PATHFINDING
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
            x: startX,
            y: startY,
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

        if (!cell) continue;

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

                x: nx,
                y: ny,

                path: [
                    ...current.path,
                    {
                        x: nx,
                        y: ny
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
                        player.nickname
                }
            );

        }

    }

}

/* =====================================================
   END CHASE
===================================================== */

function endChaseGame(
    winner
) {

    if (!gameStarted) return;

    clearGameTimers();

    gameStarted = false;

    if (
        winner === "monsters"
    ) {

        gameResult = {

            winner: "monsters",

            title:
                "👹 الوحوش تفوز",

            message:
                "تم الإمساك بجميع اللاعبين"

        };

    }

    else {

        gameResult = {

            winner: "players",

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
   MOVE PLAYER
===================================================== */

function movePlayer(
    uniqueId,
    command
) {

    if (
        !gameStarted
    ) {

        return;

    }

    const player =
        players.get(
            uniqueId
        );

    if (!player) return;

    if (
        player.alive === false
    ) {

        return;

    }

    const cell =
        maze[player.y]?.[
            player.x
        ];

    if (!cell) return;

    let nx =
        player.x;

    let ny =
        player.y;

    if (
        command === "u" &&
        !cell.walls.top
    ) {

        ny--;

    }

    else if (
        command === "d" &&
        !cell.walls.bottom
    ) {

        ny++;

    }

    else if (
        command === "r" &&
        !cell.walls.right
    ) {

        nx++;

    }

    else if (
        command === "l" &&
        !cell.walls.left
    ) {

        nx--;

    }

    else {

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

    /*
        اللاعبون يستطيعون الوقوف
        فوق بعضهم البعض.
    */

    player.x =
        nx;

    player.y =
        ny;

    /* =====================================
       TREASURE CHECK
    ====================================== */

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
   TREASURE WINNER
===================================================== */

function finishTreasureGame(
    player
) {

    if (!gameStarted) return;

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

        winner: "player",

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
   REGISTER PLAYER
===================================================== */

function registerPlayer(
    user
) {

    if (gameStarted) {

        return;

    }

    if (!registrationOpen) {

        return;

    }

    if (
        players.has(
            user.uniqueId
        )
    ) {

        return;

    }

    if (
        players.size >= MAX_PLAYERS
    ) {

        return;

    }

    players.set(
        user.uniqueId,
        {

            uniqueId:
                user.uniqueId,

            nickname:
                user.nickname,

            profilePictureUrl:
                user.profilePictureUrl,

            x: null,

            y: null,

            alive: true,

            caught: false

        }
    );

    broadcastState();

}

/* =====================================================
   REMOVE PLAYER
===================================================== */

function removePlayer(
    uniqueId
) {

    if (gameStarted) {

        return;

    }

    players.delete(
        uniqueId
    );

    broadcastState();

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
   RESET GAME
===================================================== */

function resetGame() {

    clearGameTimers();

    gameStarted = false;

    gameWinner = null;

    gameResult = null;

    maze = [];

    treasure = null;

    monsters = [];

    roundTimeLeft =
        chaseSettings.roundDuration;

    treasureTimeLeft =
        treasureSettings.duration;

    players.clear();

    registrationOpen = true;

    broadcastState();

}

/* =====================================================
   SOCKET.IO
===================================================== */

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

        /* =====================================
           TIKTOK CONNECT
        ====================================== */

        socket.on(
            "connect_tiktok",
            username => {

                username =
                    String(
                        username || ""
                    )
                    .trim()
                    .replace(/^@/, "");

                if (!username) {

                    socket.emit(
                        "tiktok_connected",
                        {
                            success: false,
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

                        tiktokLiveConnection.disconnect();

                    }

                    catch (error) {}

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
                    .then(
                        state => {

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

                        }
                    )
                    .catch(
                        error => {

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

                        }
                    );

                /* =====================================
                   CHAT
                ====================================== */

                tiktokLiveConnection.on(
                    WebcastEvent.CHAT,
                    data => {

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
                            extractAvatar(
                                data
                            );

                        if (
                            !avatar &&
                            avatarCache.has(
                                uniqueId
                            )
                        ) {

                            avatar =
                                avatarCache.get(
                                    uniqueId
                                );

                        }

                        if (
                            avatar
                        ) {

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

                        /* =====================================
                           JOIN
                        ====================================== */

                        if (
                            comment ===
                            joinKeyword
                                .toLowerCase()
                        ) {

                            registerPlayer(
                                user
                            );

                            return;

                        }

                        /* =====================================
                           MOVEMENT
                        ====================================== */

                        if (
                            comment === "u" ||
                            comment === "d" ||
                            comment === "r" ||
                            comment === "l"
                        ) {

                            movePlayer(
                                uniqueId,
                                comment
                            );

                        }

                    }
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
        );

        /* =====================================
           REMOVE PLAYER
        ====================================== */

        socket.on(
            "remove_player",
            uniqueId => {

                removePlayer(
                    uniqueId
                );

            }
        );

        /* =====================================
           TOGGLE REGISTRATION
        ====================================== */

        socket.on(
            "toggle_registration",
            () => {

                if (gameStarted) {

                    return;

                }

                registrationOpen =
                    !registrationOpen;

                broadcastState();

            }
        );

        /* =====================================
           JOIN KEYWORD
        ====================================== */

        socket.on(
            "set_join_keyword",
            keyword => {

                if (gameStarted) {

                    return;

                }

                keyword =
                    String(
                        keyword || ""
                    )
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
        );

        /* =====================================
           GAME MODE
        ====================================== */

        socket.on(
            "set_game_mode",
            mode => {

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
        );

        /* =====================================
           TREASURE SETTINGS
        ====================================== */

        socket.on(
            "set_treasure_settings",
            settings => {

                if (gameStarted) {

                    return;

                }

                const duration =
                    Number(
                        settings?.duration
                    );

                if (
                    Number.isFinite(
                        duration
                    ) &&
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
        );

        /* =====================================
           CHASE SETTINGS
        ====================================== */

        socket.on(
            "set_chase_settings",
            settings => {

                if (gameStarted) {

                    return;

                }

                const roundDuration =
                    Number(
                        settings?.roundDuration
                    );

                const monsterCount =
                    Number(
                        settings?.monsterCount
                    );

                const monsterSpeed =
                    Number(
                        settings?.monsterSpeed
                    );

                if (
                    Number.isFinite(
                        roundDuration
                    ) &&
                    roundDuration >= 10 &&
                    roundDuration <= 3600
                ) {

                    chaseSettings.roundDuration =
                        roundDuration;

                }

                if (
                    Number.isFinite(
                        monsterCount
                    ) &&
                    monsterCount >= 1 &&
                    monsterCount <= 10
                ) {

                    chaseSettings.monsterCount =
                        Math.floor(
                            monsterCount
                        );

                }

                if (
                    Number.isFinite(
                        monsterSpeed
                    ) &&
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
        );

        /* =====================================
           START
        ====================================== */

        socket.on(
            "start_game",
            () => {

                const result =
                    startGame();

                if (
                    !result.success
                ) {

                    socket.emit(
                        "game_error",
                        result.message
                    );

                    return;

                }

            }
        );

        /* =====================================
           RESET
        ====================================== */

        socket.on(
            "reset_game",
            () => {

                resetGame();

            }
        );

    }
);

/* =====================================================
   START SERVER
===================================================== */

server.listen(
    PORT,
    () => {

        console.log(
            `SAMI LIVE Maze running on port ${PORT}`
        );

    }
);
