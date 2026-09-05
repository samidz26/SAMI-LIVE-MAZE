const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} = require("tiktok-live-connector");


/* =========================================
   SERVER
========================================= */

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);


app.use(
    express.static(
        __dirname + "/public"
    )
);


/* =========================================
   SETTINGS
========================================= */

const PORT =
    process.env.PORT || 3000;

const MAZE_SIZE = 15;

const MAX_PLAYERS = 20;

const DEFAULT_JOIN_KEYWORD = "JOIN";


/* =========================================
   GAME STATE
========================================= */

let tiktokLiveConnection = null;

let connectedUsername = "";

let registrationOpen = true;

let joinKeyword =
    DEFAULT_JOIN_KEYWORD;

let gameMode = "treasure";

let gameStarted = false;

let gameWinner = null;

let players = new Map();

let maze = [];

let treasure = null;


/* =========================================
   AVATAR CACHE
========================================= */

const avatarCache =
    new Map();


/* =========================================
   AVATAR EXTRACTION
========================================= */

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


/* =========================================
   RANDOM
========================================= */

function randomInt(max) {

    return Math.floor(
        Math.random() * max
    );

}


/* =========================================
   MAZE GENERATION
========================================= */

function createEmptyMaze() {

    maze = [];


    for (
        let row = 0;
        row < MAZE_SIZE;
        row++
    ) {

        maze[row] = [];


        for (
            let col = 0;
            col < MAZE_SIZE;
            col++
        ) {

            maze[row][col] = {

                visited: false,

                walls: {

                    top: true,

                    right: true,

                    bottom: true,

                    left: true

                }

            };

        }

    }

}


/* =========================================
   REMOVE WALL
========================================= */

function removeWall(
    current,
    next,
    direction
) {

    const row = current.row;

    const col = current.col;

    const nextRow = next.row;

    const nextCol = next.col;


    if (direction === "top") {

        maze[row][col]
            .walls.top = false;

        maze[nextRow][nextCol]
            .walls.bottom = false;

    }


    if (direction === "right") {

        maze[row][col]
            .walls.right = false;

        maze[nextRow][nextCol]
            .walls.left = false;

    }


    if (direction === "bottom") {

        maze[row][col]
            .walls.bottom = false;

        maze[nextRow][nextCol]
            .walls.top = false;

    }


    if (direction === "left") {

        maze[row][col]
            .walls.left = false;

        maze[nextRow][nextCol]
            .walls.right = false;

    }

}


/* =========================================
   GENERATE PERFECT MAZE
========================================= */

function generateMaze() {

    createEmptyMaze();


    const stack = [];


    const start = {

        row: 0,

        col: 0

    };


    maze[0][0].visited = true;

    stack.push(start);


    const directions = [

        {
            dr: -1,
            dc: 0,
            wall: "top"
        },

        {
            dr: 0,
            dc: 1,
            wall: "right"
        },

        {
            dr: 1,
            dc: 0,
            wall: "bottom"
        },

        {
            dr: 0,
            dc: -1,
            wall: "left"
        }

    ];


    while (stack.length > 0) {

        const current =
            stack[
                stack.length - 1
            ];


        const available = [];


        for (
            const direction
            of directions
        ) {

            const nextRow =
                current.row +
                direction.dr;

            const nextCol =
                current.col +
                direction.dc;


            if (
                nextRow < 0 ||
                nextRow >= MAZE_SIZE ||
                nextCol < 0 ||
                nextCol >= MAZE_SIZE
            ) {

                continue;

            }


            if (
                maze[nextRow][nextCol]
                    .visited
            ) {

                continue;

            }


            available.push({

                row: nextRow,

                col: nextCol,

                wall: direction.wall

            });

        }


        if (available.length === 0) {

            stack.pop();

            continue;

        }


        const next =
            available[
                randomInt(
                    available.length
                )
            ];


        removeWall(
            current,
            next,
            next.wall
        );


        maze[next.row][next.col]
            .visited = true;


        stack.push({

            row: next.row,

            col: next.col

        });

    }


    /*
        التأكد من إغلاق الحدود الخارجية
    */

    for (
        let i = 0;
        i < MAZE_SIZE;
        i++
    ) {

        maze[0][i]
            .walls.top = true;

        maze[MAZE_SIZE - 1][i]
            .walls.bottom = true;

        maze[i][0]
            .walls.left = true;

        maze[i][MAZE_SIZE - 1]
            .walls.right = true;

    }

}


/* =========================================
   GET PLAYERS
========================================= */

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
            player.y

    }));

}


/* =========================================
   GAME STATE
========================================= */

function getGameState() {

    return {

        maze,

        treasure,

        players:
            getPlayersArray(),

        gameStarted,

        gameWinner,

        registrationOpen,

        joinKeyword,

        gameMode,

        connectedUsername

    };

}


/* =========================================
   BROADCAST
========================================= */

function broadcastGameState() {

    io.emit(
        "game_state",
        getGameState()
    );

}


/* =========================================
   FIND FREE CELL
========================================= */

function findFreeCell(
    occupied
) {

    const freeCells = [];


    for (
        let row = 0;
        row < MAZE_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < MAZE_SIZE;
            col++
        ) {

            const key =
                `${row},${col}`;


            if (
                !occupied.has(key)
            ) {

                freeCells.push({

                    x: col,

                    y: row

                });

            }

        }

    }


    if (freeCells.length === 0) {

        return null;

    }


    return freeCells[
        randomInt(
            freeCells.length
        )
    ];

}


/* =========================================
   REGISTER PLAYER
========================================= */

function registerPlayer(user) {

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


    const player = {

        uniqueId:
            user.uniqueId,

        nickname:
            user.nickname || "مستخدم",

        profilePictureUrl:
            user.profilePictureUrl || "",

        x: null,

        y: null

    };


    players.set(
        user.uniqueId,
        player
    );


    console.log(
        `Player joined: ${player.uniqueId}`
    );


    broadcastGameState();

}


/* =========================================
   REMOVE PLAYER
========================================= */

function removePlayer(uniqueId) {

    if (gameStarted) {

        return false;

    }


    if (
        !players.has(uniqueId)
    ) {

        return false;

    }


    players.delete(uniqueId);


    console.log(
        `Player removed: ${uniqueId}`
    );


    broadcastGameState();


    return true;

}


/* =========================================
   MOVE PLAYER
========================================= */

function movePlayer(
    uniqueId,
    direction
) {

    if (!gameStarted) {

        return;

    }


    if (gameWinner) {

        return;

    }


    const player =
        players.get(uniqueId);


    if (!player) {

        return;

    }


    let nx =
        player.x;

    let ny =
        player.y;


    const cell =
        maze[player.y]?.[player.x];


    if (!cell) {

        return;

    }


    /*
        U = فوق
    */

    if (
        direction === "u"
    ) {

        if (cell.walls.top) {

            return;

        }

        ny--;

    }


    /*
        D = تحت
    */

    else if (
        direction === "d"
    ) {

        if (cell.walls.bottom) {

            return;

        }

        ny++;

    }


    /*
        R = يمين
    */

    else if (
        direction === "r"
    ) {

        if (cell.walls.right) {

            return;

        }

        nx++;

    }


    /*
        L = يسار
    */

    else if (
        direction === "l"
    ) {

        if (cell.walls.left) {

            return;

        }

        nx--;

    }


    /*
        حماية الحدود
    */

    if (
        nx < 0 ||
        nx >= MAZE_SIZE ||
        ny < 0 ||
        ny >= MAZE_SIZE
    ) {

        return;

    }


    /*
        لا يمكن للاعب المرور فوق لاعب آخر
    */

    for (
        const other of players.values()
    ) {

        if (
            other.uniqueId ===
            player.uniqueId
        ) {

            continue;

        }


        if (
            other.x === nx &&
            other.y === ny
        ) {

            return;

        }

    }


    player.x = nx;

    player.y = ny;


    /*
        وصل إلى الكنز
    */

    if (
        treasure &&
        player.x === treasure.x &&
        player.y === treasure.y
    ) {

        gameWinner = {

            uniqueId:
                player.uniqueId,

            nickname:
                player.nickname,

            profilePictureUrl:
                player.profilePictureUrl

        };


        console.log(
            `WINNER: ${player.nickname}`
        );


        io.emit(
            "game_winner",
            gameWinner
        );


        broadcastGameState();


        return;

    }


    broadcastGameState();

}


/* =========================================
   START GAME
========================================= */

function startGame() {

    if (gameStarted) {

        return false;

    }


    if (players.size === 0) {

        return false;

    }


    /*
        إغلاق التسجيل
    */

    registrationOpen = false;


    /*
        توليد متاهة جديدة
    */

    generateMaze();


    /*
        إعادة ضبط المواقع
    */

    for (
        const player of players.values()
    ) {

        player.x = null;

        player.y = null;

    }


    const occupied =
        new Set();


    /*
        توزيع اللاعبين
    */

    for (
        const player of players.values()
    ) {

        const position =
            findFreeCell(
                occupied
            );


        if (!position) {

            return false;

        }


        player.x =
            position.x;

        player.y =
            position.y;


        occupied.add(
            `${position.y},${position.x}`
        );

    }


    /*
        وضع الكنز
    */

    treasure =
        findFreeCell(
            occupied
        );


    if (!treasure) {

        return false;

    }


    gameStarted = true;

    gameWinner = null;


    console.log(
        `Game started - Mode: ${gameMode}`
    );


    io.emit(
        "game_started",
        getGameState()
    );


    broadcastGameState();


    return true;

}


/* =========================================
   RESET GAME
========================================= */

function resetGame() {

    gameStarted = false;

    gameWinner = null;

    maze = [];

    treasure = null;

    players.clear();

    registrationOpen = true;


    console.log(
        "Game reset"
    );


    broadcastGameState();

}


/* =========================================
   SOCKET.IO
========================================= */

io.on(
    "connection",
    (socket) => {

        console.log(
            "Client connected to UI"
        );


        /*
            إرسال الحالة الحالية
        */

        socket.emit(
            "game_state",
            getGameState()
        );


        /* ================================
           CONNECT TIKTOK
        ================================= */

        socket.on(
            "connect_tiktok",
            (username) => {

                if (!username) {

                    return;

                }


                if (
                    tiktokLiveConnection
                ) {

                    try {

                        tiktokLiveConnection
                            .disconnect();

                    }
                    catch (error) {}

                }


                connectedUsername =
                    String(username)
                        .trim()
                        .replace(/^@/, "");


                /*
                    نفس طريقة مشروع
                    SAMI-LIVE-GAMES
                */

                tiktokLiveConnection =
                    new TikTokLiveConnection(
                        connectedUsername,
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
                                `Connected to TikTok Live: ${connectedUsername}, Room ID: ${state.roomId}`
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


                            broadcastGameState();

                        }
                    )
                    .catch(
                        error => {

                            console.error(
                                "Failed to connect to TikTok Live",
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


                /*
                    CHAT
                */

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
                            extractAvatar(data);


                        /*
                            استخدام الصورة القديمة
                            إذا لم تصل مع الرسالة الحالية
                        */

                        if (
                            !avatar &&
                            uniqueId &&
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
                            avatar &&
                            uniqueId
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


                        /*
                            التسجيل
                        */

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


                        /*
                            الحركة
                            يجب أن يكون التعليق
                            حرفًا واحدًا فقط
                        */

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


                /*
                    TikTok ERROR
                */

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


        /* ================================
           REMOVE PLAYER
        ================================= */

        socket.on(
            "remove_player",
            uniqueId => {

                removePlayer(
                    uniqueId
                );

            }
        );


        /* ================================
           TOGGLE REGISTRATION
        ================================= */

        socket.on(
            "toggle_registration",
            () => {

                if (gameStarted) {

                    return;

                }


                registrationOpen =
                    !registrationOpen;


                console.log(
                    `Registration: ${
                        registrationOpen
                            ? "OPEN"
                            : "CLOSED"
                    }`
                );


                broadcastGameState();

            }
        );


        /* ================================
           SET JOIN KEYWORD
        ================================= */

        socket.on(
            "set_join_keyword",
            keyword => {

                if (gameStarted) {

                    return;

                }


                if (
                    typeof keyword !==
                    "string"
                ) {

                    return;

                }


                keyword =
                    keyword
                        .trim()
                        .toUpperCase();


                if (!keyword) {

                    return;

                }


                if (
                    keyword.length > 20
                ) {

                    return;

                }


                joinKeyword =
                    keyword;


                console.log(
                    `Join keyword changed to: ${joinKeyword}`
                );


                socket.emit(
                    "join_keyword_updated",
                    joinKeyword
                );


                broadcastGameState();

            }
        );


        /* ================================
           SET GAME MODE
        ================================= */

        socket.on(
            "set_game_mode",
            mode => {

                if (gameStarted) {

                    return;

                }


                const allowedModes = [

                    "treasure",

                    "chase",

                    "nahroush"

                ];


                if (
                    !allowedModes.includes(
                        mode
                    )
                ) {

                    return;

                }


                gameMode =
                    mode;


                console.log(
                    `Game mode changed to: ${gameMode}`
                );


                socket.emit(
                    "game_mode_updated",
                    gameMode
                );


                broadcastGameState();

            }
        );


        /* ================================
           START GAME
        ================================= */

        socket.on(
            "start_game",
            () => {

                const started =
                    startGame();


                if (!started) {

                    socket.emit(
                        "game_error",
                        "لا يمكن بدء اللعبة الآن"
                    );

                }

            }
        );


        /* ================================
           RESET GAME
        ================================= */

        socket.on(
            "reset_game",
            () => {

                resetGame();

            }
        );

    }
);


/* =========================================
   START SERVER
========================================= */

server.listen(
    PORT,
    () => {

        console.log(
            `SAMI LIVE Maze running on port ${PORT}`
        );

    }
);
