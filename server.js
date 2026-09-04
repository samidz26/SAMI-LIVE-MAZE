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


// ==================================================
// الملفات
// ==================================================

app.use(express.static(__dirname + "/public"));


// ==================================================
// إعدادات اللعبة
// ==================================================

const MAZE_SIZE = 15;
const MAX_PLAYERS = 20;

const JOIN_COMMAND = "join";

let tiktokLiveConnection = null;

let connectedUsername = "";

let gameStarted = false;

let gameWinner = null;

const players = new Map();

let treasure = {
    x: 0,
    y: 0
};


// ==================================================
// صور اللاعبين
// ==================================================

const avatarCache = new Map();


// ==================================================
// استخراج صورة البروفايل
// ==================================================

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

                const url =
                    source.urlList.find(
                        item =>
                            typeof item === "string" &&
                            item.startsWith("http")
                    );

                if (url) return url;
            }


            if (Array.isArray(source.urls)) {

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


// ==================================================
// إنشاء متاهة
// ==================================================

function createMaze() {

    const cells = [];


    for (let y = 0; y < MAZE_SIZE; y++) {

        cells[y] = [];


        for (let x = 0; x < MAZE_SIZE; x++) {

            cells[y][x] = {

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
    }


    function getNeighbors(cell) {

        const neighbors = [];

        const { x, y } = cell;


        if (y > 0) {

            neighbors.push({
                cell: cells[y - 1][x],
                direction: "top"
            });

        }


        if (x < MAZE_SIZE - 1) {

            neighbors.push({
                cell: cells[y][x + 1],
                direction: "right"
            });

        }


        if (y < MAZE_SIZE - 1) {

            neighbors.push({
                cell: cells[y + 1][x],
                direction: "bottom"
            });

        }


        if (x > 0) {

            neighbors.push({
                cell: cells[y][x - 1],
                direction: "left"
            });

        }


        return neighbors;
    }


    function removeWall(current, next, direction) {

        if (direction === "top") {

            current.walls.top = false;
            next.walls.bottom = false;

        }

        else if (direction === "right") {

            current.walls.right = false;
            next.walls.left = false;

        }

        else if (direction === "bottom") {

            current.walls.bottom = false;
            next.walls.top = false;

        }

        else if (direction === "left") {

            current.walls.left = false;
            next.walls.right = false;

        }
    }


    const stack = [];

    const start = cells[0][0];

    start.visited = true;

    stack.push(start);


    while (stack.length > 0) {

        const current =
            stack[stack.length - 1];


        const available =
            getNeighbors(current)
                .filter(n => !n.cell.visited);


        if (available.length === 0) {

            stack.pop();

            continue;
        }


        const selected =
            available[
                Math.floor(
                    Math.random() * available.length
                )
            ];


        removeWall(
            current,
            selected.cell,
            selected.direction
        );


        selected.cell.visited = true;

        stack.push(selected.cell);
    }


    return cells;
}


// ==================================================
// المتاهة الحالية
// ==================================================

let maze = createMaze();


// ==================================================
// التحقق من وجود لاعب في الخلية
// ==================================================

function isOccupied(x, y) {

    for (const player of players.values()) {

        if (
            player.x === x &&
            player.y === y
        ) {

            return true;
        }
    }

    return false;
}


// ==================================================
// اختيار مكان عشوائي
// ==================================================

function getRandomFreePosition() {

    const free = [];


    for (let y = 0; y < MAZE_SIZE; y++) {

        for (let x = 0; x < MAZE_SIZE; x++) {

            if (!isOccupied(x, y)) {

                free.push({ x, y });
            }
        }
    }


    if (free.length === 0) {

        return null;
    }


    return free[
        Math.floor(
            Math.random() * free.length
        )
    ];
}


// ==================================================
// إنشاء كنز
// ==================================================

function spawnTreasure() {

    let position = null;


    for (let i = 0; i < 100; i++) {

        const candidate = {

            x: Math.floor(
                Math.random() * MAZE_SIZE
            ),

            y: Math.floor(
                Math.random() * MAZE_SIZE
            )

        };


        if (!isOccupied(candidate.x, candidate.y)) {

            position = candidate;

            break;
        }
    }


    if (!position) {

        position = {
            x: MAZE_SIZE - 1,
            y: MAZE_SIZE - 1
        };
    }


    treasure = position;
}


// ==================================================
// إرسال حالة اللعبة
// ==================================================

function broadcastGameState() {

    io.emit("game_state", {

        maze,

        players:
            Array.from(players.values()),

        treasure,

        gameStarted,

        winner: gameWinner

    });
}


// ==================================================
// تسجيل لاعب
// ==================================================

function registerPlayer(user) {

    if (gameStarted) {

        return {
            success: false,
            message: "اللعبة بدأت بالفعل"
        };
    }


    if (players.has(user.uniqueId)) {

        return {
            success: false,
            message: "اللاعب مسجل مسبقاً"
        };
    }


    if (players.size >= MAX_PLAYERS) {

        return {
            success: false,
            message: "اكتمل عدد اللاعبين"
        };
    }


    const position =
        getRandomFreePosition();


    if (!position) {

        return {
            success: false,
            message: "لا توجد أماكن متاحة"
        };
    }


    const player = {

        uniqueId: user.uniqueId,

        nickname: user.nickname,

        profilePictureUrl:
            user.profilePictureUrl || "",

        x: position.x,

        y: position.y,

        joinedAt: Date.now()

    };


    players.set(
        user.uniqueId,
        player
    );


    console.log(
        `PLAYER JOIN: ${player.nickname}`
    );


    broadcastGameState();


    return {
        success: true,
        player
    };
}


// ==================================================
// تحريك اللاعب
// ==================================================

function movePlayer(uniqueId, direction) {

    if (!gameStarted) return;

    if (gameWinner) return;


    const player =
        players.get(uniqueId);


    if (!player) return;


    const cell =
        maze[player.y][player.x];


    let nx = player.x;
    let ny = player.y;


    if (direction === "u") {

        if (cell.walls.top) return;

        ny--;

    }

    else if (direction === "d") {

        if (cell.walls.bottom) return;

        ny++;

    }

    else if (direction === "r") {

        if (cell.walls.right) return;

        nx++;

    }

    else if (direction === "l") {

        if (cell.walls.left) return;

        nx--;

    }

    else {

        return;
    }


    // حماية إضافية
    if (
        nx < 0 ||
        nx >= MAZE_SIZE ||
        ny < 0 ||
        ny >= MAZE_SIZE
    ) {

        return;
    }


    // منع دخول خلية لاعب آخر
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
        `${player.nickname} moved ${direction}`
    );


    // ==================================================
    // التحقق من الكنز
    // ==================================================

    if (
        player.x === treasure.x &&
        player.y === treasure.y
    ) {

        gameWinner = {

            uniqueId: player.uniqueId,

            nickname: player.nickname,

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
    }


    broadcastGameState();
}


// ==================================================
// الاتصال بالواجهة
// ==================================================

io.on("connection", socket => {

    console.log(
        "Client connected:",
        socket.id
    );


    // ==================================================
    // الاتصال بـ TikTok
    // ==================================================

    socket.on(
        "connect_tiktok",
        username => {

            if (!username) return;


            username =
                String(username)
                    .trim()
                    .replace("@", "");


            if (tiktokLiveConnection) {

                try {

                    tiktokLiveConnection.disconnect();

                } catch (error) {

                    console.error(error);

                }
            }


            connectedUsername = username;


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


                    socket.emit(
                        "tiktok_connected",
                        {

                            success: true,

                            username,

                            roomId: state.roomId,

                            roomInfo:
                                state.roomInfo

                        }
                    );

                })

                .catch(error => {

                    console.error(
                        "TikTok connection failed:",
                        error
                    );


                    socket.emit(
                        "tiktok_connected",
                        {

                            success: false,

                            error:
                                error.message ||
                                "فشل الاتصال"

                        }
                    );

                });


            // ==================================================
            // التعليقات
            // ==================================================

            tiktokLiveConnection.on(
                WebcastEvent.CHAT,
                data => {

                    const rawComment =
                        data.comment ||
                        data.content ||
                        "";


                    const comment =
                        typeof rawComment === "string"
                            ? rawComment.trim().toLowerCase()
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
                            avatarCache.get(uniqueId);
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
                        `[CHAT] ${nickname}: ${comment}`
                    );


                    // ==================================================
                    // تسجيل اللاعب
                    // ==================================================

                    if (
                        comment === JOIN_COMMAND
                    ) {

                        registerPlayer(user);

                        return;
                    }


                    // ==================================================
                    // أوامر الحركة
                    // ==================================================

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


            // ==================================================
            // أخطاء TikTok
            // ==================================================

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


    // ==================================================
    // بدء اللعبة
    // ==================================================

    socket.on(
        "start_game",
        () => {

            if (players.size === 0) {

                socket.emit(
                    "game_error",
                    "لا يوجد لاعبون"
                );

                return;
            }


            maze = createMaze();

            gameWinner = null;

            gameStarted = true;


            // إعادة توزيع اللاعبين
            const used = new Set();


            for (const player of players.values()) {

                let position = null;


                for (let i = 0; i < 100; i++) {

                    const x =
                        Math.floor(
                            Math.random() * MAZE_SIZE
                        );

                    const y =
                        Math.floor(
                            Math.random() * MAZE_SIZE
                        );


                    const key =
                        `${x},${y}`;


                    if (!used.has(key)) {

                        used.add(key);

                        position = {
                            x,
                            y
                        };

                        break;
                    }
                }


                if (position) {

                    player.x =
                        position.x;

                    player.y =
                        position.y;
                }
            }


            spawnTreasure();


            console.log(
                "GAME STARTED"
            );


            io.emit(
                "game_started"
            );


            broadcastGameState();

        }
    );


    // ==================================================
    // إعادة اللعبة
    // ==================================================

    socket.on(
        "reset_game",
        () => {

            players.clear();

            maze = createMaze();

            gameStarted = false;

            gameWinner = null;

            spawnTreasure();

            broadcastGameState();

        }
    );


    // ==================================================
    // حالة جديدة عند اتصال الواجهة
    // ==================================================

    socket.emit(
        "game_state",
        {

            maze,

            players:
                Array.from(players.values()),

            treasure,

            gameStarted,

            winner: gameWinner

        }
    );


    socket.on(
        "disconnect",
        () => {

            console.log(
                "Client disconnected:",
                socket.id
            );

        }
    );

});


// ==================================================
// تشغيل السيرفر
// ==================================================

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
