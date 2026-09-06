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

const PORT = process.env.PORT || 3000;

const MAZE_SIZE = 12;

const DEFAULT_MAX_PLAYERS = 20;
const DEFAULT_JOIN_KEYWORD = "JOIN";

const DEFAULT_TREASURE_DURATION = 10;

const DEFAULT_ROUND_DURATION = 60;
const DEFAULT_MONSTER_COUNT = 1;
const DEFAULT_MONSTER_SPEED = 1000;

const DEFAULT_NAHROUSH_USERNAME = "jordan_river13";

let tiktokLiveConnection = null;
let connectedUsername = "";

const avatarCache = new Map();

/* =========================================
   GAME SETTINGS
========================================= */

let registrationOpen = true;

let joinKeyword = DEFAULT_JOIN_KEYWORD;

let gameMode = "treasure";

let maxPlayers = DEFAULT_MAX_PLAYERS;

let nahroushUsername = DEFAULT_NAHROUSH_USERNAME;

/* =========================================
   GAME STATE
========================================= */

let gameStarted = false;

let gameWinner = null;

let gameResult = null;

let players = new Map();

let maze = [];

let treasure = null;

let treasureTimer = null;

let roundTimer = null;

let monsterTimer = null;

let roundTimeLeft = DEFAULT_ROUND_DURATION;

let treasureTimeLeft = DEFAULT_TREASURE_DURATION;

let monsters = [];

let movementLockedUntil = 0;

let nahroushCaught = false;

/* =========================================
   SETTINGS OBJECTS
========================================= */

let treasureSettings = {
    duration: DEFAULT_TREASURE_DURATION
};

let chaseSettings = {
    roundDuration: DEFAULT_ROUND_DURATION,
    monsterCount: DEFAULT_MONSTER_COUNT,
    monsterSpeed: DEFAULT_MONSTER_SPEED
};

/* =========================================
   AVATAR
========================================= */

function extractAvatar(data) {

    const user = data?.user || {};

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

        if (typeof source === "object") {

            if (Array.isArray(source.urlList)) {

                const url = source.urlList.find(
                    item =>
                        typeof item === "string" &&
                        item.startsWith("http")
                );

                if (url) return url;
            }

            if (Array.isArray(source.urls)) {

                const url = source.urls.find(
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

/* =========================================
   NAHROUSH CHECK
========================================= */

function isNahroushId(id) {

    return String(id || "")
        .replace(/^@/, "")
        .toLowerCase() ===

        String(nahroushUsername || "")
            .replace(/^@/, "")
            .toLowerCase();
}

/* =========================================
   PLAYERS ARRAY
========================================= */

function getPlayersArray() {

    return Array.from(players.values()).map(p => ({

        uniqueId: p.uniqueId,

        nickname: p.nickname,

        profilePictureUrl: p.profilePictureUrl,

        x: p.x,

        y: p.y,

        alive: p.alive !== false,

        caught: p.caught === true,

        isNahroush: p.isNahroush === true
    }));
}

/* =========================================
   GAME STATE
========================================= */

function getGameState() {

    return {

        maze,

        treasure,

        players: getPlayersArray(),

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

        chaseSettings,

        nahroushUsername,

        maxPlayers,

        movementLockedUntil
    };
}

/* =========================================
   BROADCAST
========================================= */

function broadcastState() {

    io.emit("game_state", getGameState());
}

/* =========================================
   MAZE GENERATOR
   لا تغير هذا الجزء
========================================= */

function createMaze() {

    const grid = [];

    for (let y = 0; y < MAZE_SIZE; y++) {

        const row = [];

        for (let x = 0; x < MAZE_SIZE; x++) {

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

    const stack = [];

    const sx =
        Math.floor(Math.random() * MAZE_SIZE);

    const sy =
        Math.floor(Math.random() * MAZE_SIZE);

    grid[sy][sx].visited = true;

    stack.push(grid[sy][sx]);

    /* =====================================
       RANDOMIZED DFS
    ===================================== */

    while (stack.length) {

        const current =
            stack[stack.length - 1];

        const neighbors = [];

        for (const direction of directions) {

            const nx =
                current.x + direction.dx;

            const ny =
                current.y + direction.dy;

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

        if (!neighbors.length) {

            stack.pop();

            continue;
        }

        const chosen =
            neighbors[
                Math.floor(
                    Math.random() * neighbors.length
                )
            ];

        current.walls[
            chosen.direction.wall
        ] = false;

        chosen.neighbor.walls[
            chosen.direction.opposite
        ] = false;

        chosen.neighbor.visited = true;

        stack.push(chosen.neighbor);
    }

    /* =====================================
       OPEN BETWEEN
    ===================================== */

    function openBetween(x1, y1, x2, y2) {

        if (
            x1 < 0 ||
            x1 >= MAZE_SIZE ||
            y1 < 0 ||
            y1 >= MAZE_SIZE ||

            x2 < 0 ||
            x2 >= MAZE_SIZE ||
            y2 < 0 ||
            y2 >= MAZE_SIZE
        ) {
            return false;
        }

        const a = grid[y1][x1];

        const b = grid[y2][x2];

        if (x2 === x1 + 1) {

            a.walls.right = false;

            b.walls.left = false;
        }

        else if (x2 === x1 - 1) {

            a.walls.left = false;

            b.walls.right = false;
        }

        else if (y2 === y1 + 1) {

            a.walls.bottom = false;

            b.walls.top = false;
        }

        else if (y2 === y1 - 1) {

            a.walls.top = false;

            b.walls.bottom = false;
        }

        else {

            return false;
        }

        return true;
    }

    /* =====================================
       DEGREE
    ===================================== */

    function getDegree(x, y) {

        const c = grid[y][x];

        let degree = 0;

        if (!c.walls.top && y > 0)
            degree++;

        if (
            !c.walls.right &&
            x < MAZE_SIZE - 1
        )
            degree++;

        if (
            !c.walls.bottom &&
            y < MAZE_SIZE - 1
        )
            degree++;

        if (!c.walls.left && x > 0)
            degree++;

        return degree;
    }

    /* =====================================
       CLOSED INTERNAL WALLS
    ===================================== */

    function getClosedInternalWalls() {

        const walls = [];

        for (let y = 0; y < MAZE_SIZE; y++) {

            for (let x = 0; x < MAZE_SIZE; x++) {

                if (
                    x < MAZE_SIZE - 1 &&
                    grid[y][x].walls.right
                ) {

                    walls.push({
                        x1: x,
                        y1: y,
                        x2: x + 1,
                        y2: y
                    });
                }

                if (
                    y < MAZE_SIZE - 1 &&
                    grid[y][x].walls.bottom
                ) {

                    walls.push({
                        x1: x,
                        y1: y,
                        x2: x,
                        y2: y + 1
                    });
                }
            }
        }

        return walls;
    }

    /* =====================================
       10 EXTRA LOOP OPENINGS
    ===================================== */

    let loopCandidates =
        getClosedInternalWalls()
            .sort(() => Math.random() - 0.5);

    let loopsCreated = 0;

    for (const wall of loopCandidates) {

        if (loopsCreated >= 10)
            break;

        const degree =
            getDegree(wall.x1, wall.y1) +
            getDegree(wall.x2, wall.y2);

        if (degree <= 4) {

            openBetween(
                wall.x1,
                wall.y1,
                wall.x2,
                wall.y2
            );

            loopsCreated++;
        }
    }

    /* =====================================
       CENTER 2x2 OPENING
    ===================================== */

    openBetween(5, 5, 6, 5);

    openBetween(5, 5, 5, 6);

    openBetween(6, 5, 6, 6);

    openBetween(5, 6, 6, 6);

    /* =====================================
       UP TO 2 CENTER ESCAPE ROUTES
    ===================================== */

    const centerRoutes = [

        {
            x1: 6,
            y1: 6,
            x2: 7,
            y2: 6
        },

        {
            x1: 6,
            y1: 6,
            x2: 6,
            y2: 7
        },

        {
            x1: 5,
            y1: 5,
            x2: 4,
            y2: 5
        },

        {
            x1: 5,
            y1: 5,
            x2: 5,
            y2: 4
        }
    ]
        .sort(() => Math.random() - 0.5);

    let centerConnections = 0;

    for (const route of centerRoutes) {

        if (centerConnections >= 2)
            break;

        const c =
            grid[route.y1][route.x1];

        let alreadyOpen = false;

        if (route.x2 === route.x1 + 1)
            alreadyOpen = !c.walls.right;

        else if (route.x2 === route.x1 - 1)
            alreadyOpen = !c.walls.left;

        else if (route.y2 === route.y1 + 1)
            alreadyOpen = !c.walls.bottom;

        else if (route.y2 === route.y1 - 1)
            alreadyOpen = !c.walls.top;

        if (!alreadyOpen) {

            openBetween(
                route.x1,
                route.y1,
                route.x2,
                route.y2
            );

            centerConnections++;
        }
    }

    /* =====================================
       UP TO 8 DEAD-END OPENINGS
    ===================================== */

    let deadEndCandidates = [];

    for (
        let y = 1;
        y < MAZE_SIZE - 1;
        y++
    ) {

        for (
            let x = 1;
            x < MAZE_SIZE - 1;
            x++
        ) {

            if (getDegree(x, y) === 1) {

                deadEndCandidates.push({
                    x,
                    y
                });
            }
        }
    }

    deadEndCandidates.sort(
        () => Math.random() - 0.5
    );

    let deadEndsOpened = 0;

    for (const cell of deadEndCandidates) {

        if (deadEndsOpened >= 8)
            break;

        const possible =
            getClosedInternalWalls().filter(
                wall =>
                    (
                        wall.x1 === cell.x &&
                        wall.y1 === cell.y
                    ) ||
                    (
                        wall.x2 === cell.x &&
                        wall.y2 === cell.y
                    )
            );

        if (!possible.length)
            continue;

        possible.sort((a, b) => {

            const ao =
                a.x1 === cell.x &&
                a.y1 === cell.y

                    ? [a.x2, a.y2]

                    : [a.x1, a.y1];

            const bo =
                b.x1 === cell.x &&
                b.y1 === cell.y

                    ? [b.x2, b.y2]

                    : [b.x1, b.y1];

            return (
                getDegree(ao[0], ao[1]) -
                getDegree(bo[0], bo[1])
            );
        });

        const selected = possible[0];

        openBetween(
            selected.x1,
            selected.y1,
            selected.x2,
            selected.y2
        );

        deadEndsOpened++;
    }

    /* =====================================
       FORCE OUTER BORDER CLOSED
    ===================================== */

    for (let x = 0; x < MAZE_SIZE; x++) {

        grid[0][x].walls.top = true;

        grid[MAZE_SIZE - 1][x]
            .walls.bottom = true;
    }

    for (let y = 0; y < MAZE_SIZE; y++) {

        grid[y][0].walls.left = true;

        grid[y][MAZE_SIZE - 1]
            .walls.right = true;
    }

    /* =====================================
       RESET VISITED
    ===================================== */

    for (let y = 0; y < MAZE_SIZE; y++) {

        for (let x = 0; x < MAZE_SIZE; x++) {

            grid[y][x].visited = false;
        }
    }

    return grid;
}

/* =========================================
   CLEAR TIMERS
========================================= */

function clearGameTimers() {

    if (treasureTimer) {

        clearInterval(treasureTimer);

        treasureTimer = null;
    }

    if (roundTimer) {

        clearInterval(roundTimer);

        roundTimer = null;
    }

    if (monsterTimer) {

        clearInterval(monsterTimer);

        monsterTimer = null;
    }
}

/* =========================================
   CENTER CELL
========================================= */

function centerCell() {

    return {

        x: Math.floor(MAZE_SIZE / 2),

        y: Math.floor(MAZE_SIZE / 2)
    };
}

/* =========================================
   OCCUPIED CELL
========================================= */

function isCellOccupied(
    x,
    y,
    ignoreId = null
) {

    return Array.from(
        players.values()
    ).some(
        p =>
            p.uniqueId !== ignoreId &&
            p.alive !== false &&
            p.x === x &&
            p.y === y
    );
}

/* =========================================
   RANDOM EDGE CELL
========================================= */

function getRandomEdgeCell(
    ignoreId = null
) {

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

            const edge =
                x === 0 ||
                y === 0 ||
                x === MAZE_SIZE - 1 ||
                y === MAZE_SIZE - 1;

            if (!edge)
                continue;

            if (
                isCellOccupied(
                    x,
                    y,
                    ignoreId
                )
            )
                continue;

            cells.push({ x, y });
        }
    }

    if (cells.length) {

        return cells[
            Math.floor(
                Math.random() * cells.length
            )
        ];
    }

    return {
        x: 0,
        y: 0
    };
}

/* =========================================
   RANDOM FREE CELL
========================================= */

function getRandomFreeCell(
    avoidCenter = false
) {

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
                avoidCenter &&
                x === 6 &&
                y === 6
            )
                continue;

            if (
                isCellOccupied(
                    x,
                    y
                )
            )
                continue;

            if (
                monsters.some(
                    monster =>
                        monster.x === x &&
                        monster.y === y
                )
            )
                continue;

            cells.push({
                x,
                y
            });
        }
    }

    if (cells.length) {

        return cells[
            Math.floor(
                Math.random() * cells.length
            )
        ];
    }

    return centerCell();
}

/* =========================================
   TREASURE
========================================= */

function spawnTreasure(first = false) {

    if (first) {

        treasure = centerCell();

    } else {

        treasure =
            getRandomFreeCell(false);
    }

    treasureTimeLeft =
        treasureSettings.duration;

    if (treasureTimer)
        clearInterval(treasureTimer);

    treasureTimer = setInterval(() => {

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

        if (treasureTimeLeft <= 0) {

            treasure =
                getRandomFreeCell(false);

            treasureTimeLeft =
                treasureSettings.duration;
        }

        broadcastState();

    }, 1000);
}

/* =========================================
   CHASE TIMER
========================================= */

function startRoundTimer() {

    roundTimeLeft =
        chaseSettings.roundDuration;

    if (roundTimer)
        clearInterval(roundTimer);

    roundTimer = setInterval(() => {

        if (
            !gameStarted ||
            gameMode === "nahroush"
        ) {

            clearInterval(roundTimer);

            roundTimer = null;

            return;
        }

        roundTimeLeft--;

        if (roundTimeLeft <= 0) {

            const alive =
                Array.from(
                    players.values()
                ).filter(
                    p =>
                        p.alive &&
                        !p.isNahroush
                );

            endChaseGame(
                alive.length
                    ? "players"
                    : "monsters"
            );

            return;
        }

        broadcastState();

    }, 1000);
}

/* =========================================
   MONSTER SPAWN
========================================= */

function getMonsterSpawnCell(index) {

    if (index === 0) {

        return centerCell();
    }

    const cell =
        getRandomFreeCell(false);

    const center =
        centerCell();

    const distance =
        Math.abs(
            cell.x - center.x
        ) +
        Math.abs(
            cell.y - center.y
        );

    if (distance <= 2) {

        return {

            x: Math.min(
                MAZE_SIZE - 1,
                center.x +
                (index % 2 ? 1 : -1)
            ),

            y: center.y
        };
    }

    return cell;
}

/* =========================================
   SPAWN MONSTERS
========================================= */

function spawnMonsters() {

    monsters = [];

    for (
        let i = 0;
        i < chaseSettings.monsterCount;
        i++
    ) {

        const position =
            getMonsterSpawnCell(i);

        monsters.push({

            id: `monster-${i + 1}`,

            x: position.x,

            y: position.y
        });
    }
}

/* =========================================
   MAZE NEIGHBORS
========================================= */

function getNeighbors(x, y) {

    const cell =
        maze[y]?.[x];

    const output = [];

    if (!cell)
        return output;

    if (!cell.walls.top) {

        output.push({
            x,
            y: y - 1
        });
    }

    if (!cell.walls.right) {

        output.push({
            x: x + 1,
            y
        });
    }

    if (!cell.walls.bottom) {

        output.push({
            x,
            y: y + 1
        });
    }

    if (!cell.walls.left) {

        output.push({
            x: x - 1,
            y
        });
    }

    return output.filter(
        p =>
            p.x >= 0 &&
            p.x < MAZE_SIZE &&
            p.y >= 0 &&
            p.y < MAZE_SIZE
    );
}

/* =========================================
   BFS PATHFINDING
========================================= */

function findPath(
    sx,
    sy,
    tx,
    ty
) {

    if (
        sx === tx &&
        sy === ty
    ) {
        return [];
    }

    const queue = [
        {
            x: sx,
            y: sy
        }
    ];

    const visited =
        new Set([
            `${sx},${sy}`
        ]);

    const previous =
        new Map();

    while (queue.length) {

        const current =
            queue.shift();

        for (
            const next
            of getNeighbors(
                current.x,
                current.y
            )
        ) {

            const key =
                `${next.x},${next.y}`;

            if (visited.has(key))
                continue;

            visited.add(key);

            previous.set(
                key,
                current
            );

            if (
                next.x === tx &&
                next.y === ty
            ) {

                const path = [];

                let position = next;

                while (
                    !(
                        position.x === sx &&
                        position.y === sy
                    )
                ) {

                    path.unshift(position);

                    position =
                        previous.get(
                            `${position.x},${position.y}`
                        );
                }

                return path;
            }

            queue.push(next);
        }
    }

    return [];
}

/* =========================================
   MONSTER CATCH
   مهم:
   الوحش يستهدف اللاعبين العاديين فقط
   ولا يستهدف نهروش أبداً
========================================= */

function catchRegularPlayersOnMonsterCells() {

    let changed = false;

    for (const monster of monsters) {

        for (const player of players.values()) {

            /* نهروش محمي تماماً من الوحش */

            if (
                !player.alive ||
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

                changed = true;

                io.emit(
                    "player_eliminated",
                    {
                        uniqueId:
                            player.uniqueId,

                        nickname:
                            player.nickname,

                        profilePictureUrl:
                            player.profilePictureUrl,

                        reason: "monster"
                    }
                );
            }
        }
    }

    return changed;
}

/* =========================================
   MOVE MONSTERS
========================================= */

function moveMonsters() {

    if (
        !gameStarted ||
        !monsters.length
    ) {
        return;
    }

    /*
       الوحش يبحث فقط عن اللاعبين
       العاديين الأحياء.
       
       نهروش مستبعد تماماً.
    */

    const targets =
        Array.from(
            players.values()
        ).filter(
            p =>
                p.alive &&
                !p.isNahroush
        );

    /* =====================================
       لا يوجد لاعبون عاديون
       نهروش + الوحش يفوزان
    ===================================== */

    if (!targets.length) {

        if (gameMode === "nahroush") {

            endNahroushGame(
                "monsters"
            );

        } else {

            endChaseGame(
                "monsters"
            );
        }

        return;
    }

    /* =====================================
       تحريك كل وحش
    ===================================== */

    for (const monster of monsters) {

        let bestPlayer = null;

        let bestPath = null;

        for (
            const player
            of targets
        ) {

            const path =
                findPath(
                    monster.x,
                    monster.y,
                    player.x,
                    player.y
                );

            if (
                path.length &&
                (
                    bestPath === null ||
                    path.length <
                    bestPath.length
                )
            ) {

                bestPlayer = player;

                bestPath = path;
            }
        }

        if (
            bestPlayer &&
            bestPath &&
            bestPath.length
        ) {

            const step =
                bestPath[0];

            monster.x = step.x;

            monster.y = step.y;
        }
    }

    /* =====================================
       اصطياد اللاعبين فقط
    ===================================== */

    const changed =
        catchRegularPlayersOnMonsterCells();

    /* =====================================
       تحقق من نهاية مود نهروش
    ===================================== */

    if (gameMode === "nahroush") {

        const aliveRegularPlayers =
            Array.from(
                players.values()
            ).some(
                p =>
                    p.alive &&
                    !p.isNahroush
            );

        if (!aliveRegularPlayers) {

            endNahroushGame(
                "monsters"
            );

            return;
        }

    } else {

        const alivePlayers =
            Array.from(
                players.values()
            ).some(
                p =>
                    p.alive &&
                    !p.isNahroush
            );

        if (!alivePlayers) {

            endChaseGame(
                "monsters"
            );

            return;
        }
    }

    if (
        changed ||
        gameStarted
    ) {

        broadcastState();
    }
}

/* =========================================
   MONSTER LOOP
========================================= */

function startMonsterLoop() {

    if (monsterTimer)
        clearInterval(monsterTimer);

    monsterTimer = setInterval(
        moveMonsters,
        chaseSettings.monsterSpeed
    );
}

/* =========================================
   START GAME
========================================= */

function startGame() {

    if (gameStarted) {

        return {
            success: false,
            message: "اللعبة بدأت بالفعل"
        };
    }

    if (!players.size) {

        return {
            success: false,
            message:
                "يجب تسجيل لاعب واحد على الأقل"
        };
    }

    /* =====================================
       NAHROUSH MUST BE PRESENT
    ===================================== */

    if (
        gameMode === "nahroush" &&
        !playersHasNahroush()
    ) {

        return {

            success: false,

            message:
                `يجب أن يدخل نهروش أولاً: @${nahroushUsername}`
        };
    }

    clearGameTimers();

    gameWinner = null;

    gameResult = null;

    nahroushCaught = false;

    maze = createMaze();

    monsters = [];

    const center =
        centerCell();

    /* =====================================
       RESET PLAYERS
    ===================================== */

    for (
        const player
        of players.values()
    ) {

        player.alive = true;

        player.caught = false;

        player.isNahroush =
            isNahroushId(
                player.uniqueId
            );
    }

    /* =====================================
       TREASURE
    ===================================== */

    if (gameMode === "treasure") {

        for (
            const player
            of players.values()
        ) {

            const spawn =
                getRandomEdgeCell(
                    player.uniqueId
                );

            player.x = spawn.x;

            player.y = spawn.y;
        }

        gameStarted = true;

        movementLockedUntil =
            Date.now() + 5000;

        spawnTreasure(true);
    }

    /* =====================================
       CHASE
    ===================================== */

    else if (gameMode === "chase") {

        for (
            const player
            of players.values()
        ) {

            const spawn =
                getRandomEdgeCell(
                    player.uniqueId
                );

            player.x = spawn.x;

            player.y = spawn.y;
        }

        spawnMonsters();

        gameStarted = true;

        movementLockedUntil =
            Date.now() + 5000;

        startRoundTimer();

        startMonsterLoop();
    }

    /* =====================================
       NAHROUSH
    ===================================== */

    else if (gameMode === "nahroush") {

        /* =================================
           نهروش يبدأ في المركز
        ================================= */

        for (
            const player
            of players.values()
        ) {

            if (player.isNahroush) {

                player.x =
                    center.x;

                player.y =
                    center.y;
            }
        }

        /* =================================
           اللاعبون العاديون على الحواف
        ================================= */

        for (
            const player
            of players.values()
        ) {

            if (player.isNahroush)
                continue;

            const spawn =
                getRandomEdgeCell(
                    player.uniqueId
                );

            player.x = spawn.x;

            player.y = spawn.y;
        }

        /*
           أول وحش يبدأ في المركز أيضاً.
           
           مهم:
           وجود الوحش في نفس خلية نهروش
           لا يعني أن نهروش سيتم اصطياده.
           الوحش يتجاهل نهروش تماماً.
        */

        spawnMonsters();

        gameStarted = true;

        movementLockedUntil =
            Date.now() + 5000;

        /*
           لا يوجد round timer في مود نهروش.
        */

        startMonsterLoop();
    }

    broadcastState();

    return {
        success: true
    };
}

/* =========================================
   CHECK NAHROUSH
========================================= */

function playersHasNahroush() {

    return Array.from(
        players.values()
    ).some(
        player =>
            player.isNahroush ||
            isNahroushId(
                player.uniqueId
            )
    );
}

/* =========================================
   END CHASE
========================================= */

function endChaseGame(winner) {

    if (!gameStarted)
        return;

    clearGameTimers();

    gameStarted = false;

    if (winner === "monsters") {

        gameResult = {

            winner: "monsters",

            title: "👹 الوحوش تفوز",

            message:
                "تم الإمساك بجميع اللاعبين"
        };

    } else {

        gameResult = {

            winner: "players",

            title: "🏆 اللاعبون يفوزون",

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

/* =========================================
   END NAHROUSH
========================================= */

function endNahroushGame(winner) {

    if (!gameStarted)
        return;

    clearGameTimers();

    gameStarted = false;

    /* =====================================
       PLAYERS WIN
       لاعب وصل إلى نهروش
    ===================================== */

    if (winner === "players") {

        const nahroush =
            Array.from(
                players.values()
            ).find(
                p =>
                    p.isNahroush
            );

        let winnerPlayer = null;

        if (nahroush) {

            winnerPlayer =
                Array.from(
                    players.values()
                ).find(
                    p =>
                        p.alive &&
                        !p.isNahroush &&
                        p.x === nahroush.x &&
                        p.y === nahroush.y
                );
        }

        gameWinner =
            winnerPlayer
                ? {

                    uniqueId:
                        winnerPlayer.uniqueId,

                    nickname:
                        winnerPlayer.nickname,

                    profilePictureUrl:
                        winnerPlayer.profilePictureUrl

                }
                : null;

        gameResult = {

            winner: "players",

            title:
                "🏆 اللاعبون يفوزون",

            message:
                winnerPlayer
                    ? `${winnerPlayer.nickname} أمسك نهروش!`
                    : "تم القبض على نهروش!"
        };
    }

    /* =====================================
       NAHROUSH + MONSTER WIN
    ===================================== */

    else {

        const nahroush =
            Array.from(
                players.values()
            ).find(
                p =>
                    p.isNahroush
            );

        gameWinner =
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

        gameResult = {

            winner: "nahroush",

            title:
                "👹 نهروش والوحش يفوزان",

            message:
                "تم إقصاء جميع اللاعبين
