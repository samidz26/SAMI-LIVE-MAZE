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


// =====================================================
// الإعدادات
// =====================================================

const MAZE_SIZE = 15;
const MAX_PLAYERS = 20;
const JOIN_COMMAND = "join";


// =====================================================
// حالة السيرفر
// =====================================================

let tiktokLiveConnection = null;
let connectedUsername = "";

let gameStarted = false;
let gameWinner = null;

const players = new Map();

let maze = [];
let treasure = {
    x: 0,
    y: 0
};

const avatarCache = new Map();


// =====================================================
// إنشاء خلية
// =====================================================

function createCell(x, y) {

    return {
        x,
        y,
        visited: false,

        walls: {
            top: true,
            right: true,
            bottom: true,
            left: true
        }
    };
}


// =====================================================
// إنشاء المتاهة
// Recursive Backtracking
// =====================================================

function generateMaze() {

    maze = [];

    for (let y = 0; y < MAZE_SIZE; y++) {

        const row = [];

        for (let x = 0; x < MAZE_SIZE; x++) {
            row.push(createCell(x, y));
        }

        maze.push(row);
    }


    const stack = [];

    const start = maze[0][0];

    start.visited = true;

    stack.push(start);


    const directions = [
        { dx: 0, dy: -1, wall: "top", opposite: "bottom" },
        { dx: 1, dy: 0, wall: "right", opposite: "left" },
        { dx: 0, dy: 1, wall: "bottom", opposite: "top" },
        { dx: -1, dy: 0, wall: "left", opposite: "right" }
    ];


    while (stack.length > 0) {

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
                maze[ny][nx];


            if (!neighbor.visited) {

                neighbors.push({
                    neighbor,
                    direction
                });

            }

        }


        if (neighbors.length === 0) {

            stack.pop();

            continue;
        }


        const selected =
            neighbors[
                Math.floor(
                    Math.random() *
                    neighbors.length
                )
            ];


        const next =
            selected.neighbor;

        const direction =
            selected.direction;


        current.walls[direction.wall] =
            false;

        next.walls[direction.opposite] =
            false;


        next.visited = true;

        stack.push(next);

    }


    // إزالة visited قبل إرسال المتاهة
    for (const row of maze) {

        for (const cell of row) {

            delete cell.visited;

        }

    }

}


// =====================================================
// أماكن فارغة
// =====================================================

function getOccupiedPositions() {

    const occupied = new Set();

    for (const player of players.values()) {

        if (
            typeof player.x === "number" &&
            typeof player.y === "number"
        ) {

            occupied.add(
                `${player.x},${player.y}`
            );

        }

    }

    return occupied;
}


// =====================================================
// اختيار مكان فارغ
// =====================================================

function getRandomFreePosition() {

    const occupied =
        getOccupiedPositions();


    const free = [];


    for (let y = 0; y < MAZE_SIZE; y++) {

        for (let x = 0; x < MAZE_SIZE; x++) {

            if (
                !occupied.has(`${x},${y}`)
            ) {

                free.push({ x, y });

            }

        }

    }


    if (free.length === 0) {
        return null;
    }


    return free[
        Math.floor(
            Math.random() *
            free.length
        )
    ];
}


// =====================================================
// اختيار الكنز
// =====================================================

function placeTreasure() {

    const occupied =
        getOccupiedPositions();


    const free = [];


    for (let y = 0; y < MAZE_SIZE; y++) {

        for (let x = 0; x < MAZE_SIZE; x++) {

            if (
                !occupied.has(`${x},${y}`)
            ) {

                free.push({ x, y });

            }

        }

    }


    if (free.length === 0) {

        treasure = {
            x: 0,
            y: 0
        };

        return;
    }


    treasure =
        free[
            Math.floor(
                Math.random() *
                free.length
            )
        ];
}


// =====================================================
// استخراج صورة الحساب
// =====================================================

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
                Array.isArray(source.urlList)
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
                Array.isArray(source.urls)
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


// =====================================================
// بيانات اللاعبين للواجهة
// =====================================================

function getPlayersArray() {

    return Array.from(
        players.values()
    ).map(player => ({

        uniqueId:
            player.uniqueId,

        nickname:
            player.nickname,

        profilePictureUrl:
            player.profilePictureUrl || "",

        x:
            player.x,

        y:
            player.y

    }));

}


// =====================================================
// إرسال حالة اللعبة
// =====================================================

function broadcastGameState() {

    io.emit(
        "game_state",
        {

            maze,

            players:
                getPlayersArray(),

            treasure:
                gameStarted
                    ? treasure
                    : null,

            gameStarted,

            winner:
                gameWinner

        }
    );

}


// =====================================================
// تسجيل لاعب
// =====================================================

function registerPlayer(user) {

    if (gameStarted) {
        return;
    }


    if (gameWinner) {
        return;
    }


    const uniqueId =
        user.uniqueId;


    if (!uniqueId) {
        return;
    }


    // اللاعب مسجل مسبقًا

    if (players.has(uniqueId)) {
        return;
    }


    // الحد الأقصى

    if (
        players.size >= MAX_PLAYERS
    ) {

        console.log(
            "Maximum players reached"
        );

        return;
    }


    const player = {

        uniqueId,

        nickname:
            user.nickname || "مستخدم",

        profilePictureUrl:
            user.profilePictureUrl || "",

        x: null,

        y: null

    };


    players.set(
        uniqueId,
        player
    );


    console.log(
        `PLAYER JOINED: @${uniqueId}`
    );


    broadcastGameState();

}


// =====================================================
// تحريك اللاعب
// =====================================================

function movePlayer(uniqueId, direction) {

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
        maze[player.y][player.x];


    // -----------------------------------------
    // الحركة
    // -----------------------------------------

    if (direction === "u") {

        if (cell.walls.top) {
            return;
        }

        ny--;

    }


    else if (direction === "d") {

        if (cell.walls.bottom) {
            return;
        }

        ny++;

    }


    else if (direction === "r") {

        if (cell.walls.right) {
            return;
        }

        nx++;

    }


    else if (direction === "l") {

        if (cell.walls.left) {
            return;
        }

        nx++;

        nx--;

    }


    // -----------------------------------------
    // حدود المتاهة
    // -----------------------------------------

    if (
        nx < 0 ||
        nx >= MAZE_SIZE ||
        ny < 0 ||
        ny >= MAZE_SIZE
    ) {
        return;
    }


    // -----------------------------------------
    // منع دخول لاعب إلى مكان لاعب آخر
    // -----------------------------------------

    for (const other of players.values()) {

        if (
            other.uniqueId !== uniqueId &&
            other.x === nx &&
            other.y === ny
        ) {

            return;

        }

    }


    player.x = nx;
    player.y = ny;


    console.log(
        `MOVE @${uniqueId}: ${direction.toUpperCase()}`
    );


    // -----------------------------------------
    // فحص الكنز
    // -----------------------------------------

    if (
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


        gameStarted = false;


        console.log(
            `WINNER: @${player.uniqueId}`
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


// =====================================================
// بدء اللعبة
// =====================================================

function startGame() {

    if (gameStarted) {
        return;
    }


    if (players.size === 0) {

        io.emit(
            "game_error",
            "لا يوجد لاعبون مسجلون."
        );

        return;
    }


    generateMaze();


    // وضع اللاعبين

    for (const player of players.values()) {

        const position =
            getRandomFreePosition();


        if (!position) {
            continue;
        }


        player.x =
            position.x;

        player.y =
            position.y;

    }


    // وضع الكنز

    placeTreasure();


    gameWinner = null;

    gameStarted = true;


    console.log(
        `GAME STARTED - ${players.size} players`
    );


    const state = {

        maze,

        players:
            getPlayersArray(),

        treasure,

        gameStarted: true,

        winner: null

    };


    io.emit(
        "game_started",
        state
    );


    broadcastGameState();

}


// =====================================================
// إعادة الجولة
// =====================================================

function resetGame() {

    console.log(
        "RESET GAME"
    );


    gameStarted = false;

    gameWinner = null;


    // حذف اللاعبين

    players.clear();


    maze = [];


    treasure = {
        x: 0,
        y: 0
    };


    io.emit(
        "game_state",
        {

            maze: [],

            players: [],

            treasure: null,

            gameStarted: false,

            winner: null

        }
    );

}


// =====================================================
// اتصال واجهة اللعبة
// =====================================================

io.on("connection", socket => {

    console.log(
        "Client connected to UI"
    );


    // إرسال الحالة الحالية فورًا

    socket.emit(
        "game_state",
        {

            maze,

            players:
                getPlayersArray(),

            treasure:
                gameStarted
                    ? treasure
                    : null,

            gameStarted,

            winner:
                gameWinner

        }
    );


    // -----------------------------------------
    // الاتصال بـ TikTok
    // -----------------------------------------

    socket.on(
        "connect_tiktok",
        username => {

            if (
                typeof username !== "string" ||
                !username.trim()
            ) {

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


            username =
                username
                    .trim()
                    .replace(/^@/, "");


            if (tiktokLiveConnection) {

                try {
                    tiktokLiveConnection.disconnect();
                } catch (error) {}

            }


            connectedUsername =
                username;


            console.log(
                `Connecting to TikTok LIVE: @${username}`
            );


            tiktokLiveConnection =
                new TikTokLiveConnection(
                    username,
                    {
                        processInitialData: true,
                        fetchRoomInfoOnConnect: true
                    }
                );


            tiktokLiveConnection
                .connect()

                .then(state => {

                    console.log(
                        `Connected to TikTok Live: @${username}`
                    );

                    console.log(
                        `Room ID: ${state.roomId}`
                    );


                    socket.emit(
                        "tiktok_connected",
                        {

                            success: true,

                            roomInfo:
                                state.roomInfo

                        }
                    );

                })

                .catch(error => {

                    console.error(
                        "Failed to connect to TikTok LIVE:",
                        error
                    );


                    socket.emit(
                        "tiktok_connected",
                        {

                            success: false,

                            error:
                                error.message ||
                                "فشل الاتصال بـ TikTok LIVE"

                        }
                    );

                });


            // -----------------------------------------
            // التعليقات
            // -----------------------------------------

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


                    if (
                        !avatar &&
                        uniqueId &&
                        avatarCache.has(uniqueId)
                    ) {

                        avatar =
                            avatarCache.get(uniqueId);

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
                        `[CHAT] @${uniqueId} (${nickname}): ${comment}`
                    );


                    // -----------------------------------------
                    // التسجيل
                    // -----------------------------------------

                    if (
                        comment === JOIN_COMMAND
                    ) {

                        registerPlayer(user);

                        return;
                    }


                    // -----------------------------------------
                    // الحركة
                    // -----------------------------------------

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


            // -----------------------------------------
            // أخطاء TikTok
            // -----------------------------------------

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


    // -----------------------------------------
    // بدء اللعبة
    // -----------------------------------------

    socket.on(
        "start_game",
        () => {

            startGame();

        }
    );


    // -----------------------------------------
    // جولة جديدة
    // -----------------------------------------

    socket.on(
        "reset_game",
        () => {

            resetGame();

        }
    );

});


// =====================================================
// تشغيل السيرفر
// =====================================================

const PORT =
    process.env.PORT || 3000;


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `SAMI LIVE MAZE running on port ${PORT}`
        );

    }
);
