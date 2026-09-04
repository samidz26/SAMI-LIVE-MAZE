const socket = io();

const svg = document.getElementById("maze");

const playerCount =
    document.getElementById("playerCount");

const gameStatus =
    document.getElementById("gameStatus");

const playersList =
    document.getElementById("playersList");

const message =
    document.getElementById("message");

const startButton =
    document.getElementById("startButton");

const resetButton =
    document.getElementById("resetButton");

const connectionStatus =
    document.getElementById("connectionStatus");


// ==================================================
// إعدادات المتاهة
// ==================================================

const SIZE = 15;
const CELL = 20;


// ==================================================
// حالة اللعبة
// ==================================================

let maze = [];

let players = [];

let treasure = null;

let gameStarted = false;

let winner = null;


// ==================================================
// Socket.IO
// ==================================================

socket.on("connect", () => {

    connectionStatus.textContent =
        "🟢 متصل بالسيرفر";

});


socket.on("disconnect", () => {

    connectionStatus.textContent =
        "🔴 انقطع الاتصال";

});


// ==================================================
// استقبال حالة اللعبة
// ==================================================

socket.on("game_state", data => {

    maze =
        data.maze || [];

    players =
        data.players || [];

    treasure =
        data.treasure || null;

    gameStarted =
        data.gameStarted || false;

    winner =
        data.winner || null;


    renderEverything();

});


// ==================================================
// بداية اللعبة
// ==================================================

socket.on("game_started", () => {

    gameStarted = true;

    winner = null;

    gameStatus.textContent =
        "🔥 اللعبة بدأت!";

    message.textContent =
        "تحرك باستخدام U / D / R / L";

    startButton.disabled = true;

});


// ==================================================
// الفوز
// ==================================================

socket.on("game_winner", player => {

    winner = player;

    gameStarted = false;


    gameStatus.textContent =
        "🏆 انتهت اللعبة";


    message.innerHTML =
        `🏆 الفائز هو <strong>${escapeHtml(player.nickname)}</strong> 🎉`;


    startButton.disabled = true;


    renderEverything();

});


// ==================================================
// خطأ في اللعبة
// ==================================================

socket.on("game_error", error => {

    message.textContent =
        "⚠️ " + error;

});


// ==================================================
// زر بدء اللعبة
// ==================================================

startButton.addEventListener("click", () => {

    if (players.length === 0) {

        message.textContent =
            "⚠️ لا يوجد لاعبون مسجلون";

        return;
    }


    socket.emit("start_game");

});


// ==================================================
// زر إعادة اللعبة
// ==================================================

resetButton.addEventListener("click", () => {

    socket.emit("reset_game");

    message.innerHTML =
        'أرسل <strong>JOIN</strong> في الشات للدخول';

});


// ==================================================
// رسم كل شيء
// ==================================================

function renderEverything() {

    renderMaze();

    renderTreasure();

    renderPlayers();

    renderPlayersList();

    updateGameInfo();

}


// ==================================================
// رسم المتاهة
// ==================================================

function renderMaze() {

    svg.innerHTML = "";


    if (!maze.length) return;


    /*
        الإطار الخارجي
    */

    drawLine(
        0,
        0,
        300,
        0
    );


    drawLine(
        300,
        0,
        300,
        300
    );


    drawLine(
        300,
        300,
        0,
        300
    );


    drawLine(
        0,
        300,
        0,
        0
    );


    /*
        الجدران الداخلية
    */

    for (
        let y = 0;
        y < SIZE;
        y++
    ) {

        for (
            let x = 0;
            x < SIZE;
            x++
        ) {

            const cell =
                maze[y]?.[x];


            if (!cell) continue;


            const px =
                x * CELL;

            const py =
                y * CELL;


            if (cell.walls.top) {

                drawLine(
                    px,
                    py,
                    px + CELL,
                    py
                );

            }


            if (cell.walls.right) {

                drawLine(
                    px + CELL,
                    py,
                    px + CELL,
                    py + CELL
                );

            }


            if (cell.walls.bottom) {

                drawLine(
                    px,
                    py + CELL,
                    px + CELL,
                    py + CELL
                );

            }


            if (cell.walls.left) {

                drawLine(
                    px,
                    py,
                    px,
                    py + CELL
                );

            }

        }

    }

}


// ==================================================
// رسم خط
// ==================================================

function drawLine(
    x1,
    y1,
    x2,
    y2
) {

    const line =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );


    line.setAttribute(
        "x1",
        x1
    );

    line.setAttribute(
        "y1",
        y1
    );

    line.setAttribute(
        "x2",
        x2
    );

    line.setAttribute(
        "y2",
        y2
    );


    line.setAttribute(
        "class",
        "maze-wall"
    );


    svg.appendChild(line);

}


// ==================================================
// رسم الكنز
// ==================================================

function renderTreasure() {

    if (!treasure) return;


    const px =
        treasure.x * CELL +
        CELL / 2;

    const py =
        treasure.y * CELL +
        CELL / 2;


    const group =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );


    group.setAttribute(
        "class",
        "treasure"
    );


    const glow =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );


    glow.setAttribute(
        "cx",
        px
    );

    glow.setAttribute(
        "cy",
        py
    );

    glow.setAttribute(
        "r",
        9
    );


    glow.setAttribute(
        "class",
        "treasure-glow"
    );


    const text =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );


    text.setAttribute(
        "x",
        px
    );

    text.setAttribute(
        "y",
        py
    );


    text.setAttribute(
        "class",
        "treasure-icon"
    );


    text.textContent = "🎁";


    group.appendChild(glow);

    group.appendChild(text);

    svg.appendChild(group);

}


// ==================================================
// رسم اللاعبين
// ==================================================

function renderPlayers() {

    players.forEach(player => {

        const px =
            player.x * CELL +
            CELL / 2;

        const py =
            player.y * CELL +
            CELL / 2;


        const group =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "g"
            );


        group.setAttribute(
            "class",
            "player"
        );


        /*
            دائرة اللاعب
        */

        const circle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );


        circle.setAttribute(
            "cx",
            px
        );

        circle.setAttribute(
            "cy",
            py
        );

        circle.setAttribute(
            "r",
            7
        );


        circle.setAttribute(
            "class",
            "player-circle"
        );


        group.appendChild(circle);


        /*
            صورة البروفايل
        */

        if (
            player.profilePictureUrl
        ) {

            const image =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "image"
                );


            image.setAttribute(
                "x",
                px - 6
            );

            image.setAttribute(
                "y",
                py - 6
            );

            image.setAttribute(
                "width",
                12
            );

            image.setAttribute(
                "height",
                12
            );


            image.setAttribute(
                "href",
                player.profilePictureUrl
            );


            image.setAttribute(
                "preserveAspectRatio",
                "xMidYMid slice"
            );


            image.setAttribute(
                "class",
                "player-avatar"
            );


            group.appendChild(image);

        }


        /*
            اسم اللاعب
        */

        const name =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );


        name.setAttribute(
            "x",
            px
        );

        name.setAttribute(
            "y",
            py - 8
        );


        name.setAttribute(
            "class",
            "player-name"
        );


        name.textContent =
            player.nickname;


        group.appendChild(name);


        svg.appendChild(group);

    });

}


// ==================================================
// قائمة اللاعبين
// ==================================================

function renderPlayersList() {

    if (players.length === 0) {

        playersList.innerHTML =
            `<div class="empty-players">
                في انتظار اللاعبين...
            </div>`;

        return;
    }


    playersList.innerHTML = "";


    players.forEach(
        (player, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "player-list-item";


            const avatar =
                document.createElement(
                    "img"
                );


            avatar.src =
                player.profilePictureUrl ||
                "https://via.placeholder.com/50";


            avatar.alt =
                player.nickname;


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "player-list-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                player.nickname;


            const number =
                document.createElement(
                    "span"
                );


            number.textContent =
                `لاعب ${index + 1}`;


            info.appendChild(name);

            info.appendChild(number);


            item.appendChild(avatar);

            item.appendChild(info);


            playersList.appendChild(item);

        }
    );

}


// ==================================================
// معلومات اللعبة
// ==================================================

function updateGameInfo() {

    playerCount.textContent =
        players.length;


    if (winner) {

        gameStatus.textContent =
            "🏆 انتهت الجولة";

        return;
    }


    if (gameStarted) {

        gameStatus.textContent =
            "🔥 اللعب الآن";

        return;
    }


    gameStatus.textContent =
        "🟢 التسجيل مفتوح";


    startButton.disabled =
        players.length === 0;

}


// ==================================================
// حماية النصوص
// ==================================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text || "";


    return div.innerHTML;

}
