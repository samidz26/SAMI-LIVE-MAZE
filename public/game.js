const socket = io();


// =========================================
// عناصر الشاشات
// =========================================

const registrationScreen =
    document.getElementById("registrationScreen");

const mazeScreen =
    document.getElementById("mazeScreen");

const winnerScreen =
    document.getElementById("winnerScreen");


// =========================================
// عناصر التسجيل
// =========================================

const playerCount =
    document.getElementById("playerCount");

const registrationPlayers =
    document.getElementById("registrationPlayers");

const startButton =
    document.getElementById("startButton");

const registrationMessage =
    document.getElementById("registrationMessage");


// =========================================
// عناصر المتاهة
// =========================================

const maze =
    document.getElementById("maze");

const mazePlayerCount =
    document.getElementById("mazePlayerCount");

const mazeMessage =
    document.getElementById("mazeMessage");


// =========================================
// عناصر الفائز
// =========================================

const winnerAvatar =
    document.getElementById("winnerAvatar");

const winnerName =
    document.getElementById("winnerName");

const resetButton =
    document.getElementById("resetButton");


// =========================================
// الحالة
// =========================================

let gameState = {
    maze: [],
    players: [],
    treasure: null,
    gameStarted: false,
    winner: null
};


// =========================================
// إظهار شاشة
// =========================================

function showScreen(screen) {

    registrationScreen.classList.add("hidden");
    mazeScreen.classList.add("hidden");
    winnerScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}


// =========================================
// اتصال Socket
// =========================================

socket.on("connect", () => {

    console.log("Connected to game server");

});


// =========================================
// انقطاع الاتصال
// =========================================

socket.on("disconnect", () => {

    console.log("Disconnected from server");

    const status =
        document.getElementById("connectionStatus");

    if (status) {
        status.textContent = "🔴 غير متصل";
    }

});


// =========================================
// حالة اللعبة
// =========================================

socket.on("game_state", (state) => {

    gameState = state;

    renderGame();

});


// =========================================
// بدء اللعبة
// =========================================

socket.on("game_started", (state) => {

    gameState = state;

    showScreen(mazeScreen);

    renderGame();

    mazeMessage.textContent =
        "🚀 بدأت اللعبة! أرسل U D R L للتحرك.";

});


// =========================================
// الفوز
// =========================================

socket.on("game_winner", (winner) => {

    gameState.winner = winner;
    gameState.gameStarted = false;

    showWinner(winner);

});


// =========================================
// خطأ
// =========================================

socket.on("game_error", (message) => {

    alert(message);

});


// =========================================
// زر بدء اللعبة
// =========================================

startButton.addEventListener("click", () => {

    if (!gameState.players ||
        gameState.players.length === 0) {

        registrationMessage.textContent =
            "⚠️ لا يوجد لاعبون مسجلون بعد";

        return;
    }

    socket.emit("start_game");

});


// =========================================
// زر جولة جديدة
// =========================================

resetButton.addEventListener("click", () => {

    socket.emit("reset_game");

});


// =========================================
// رسم اللعبة
// =========================================

function renderGame() {

    if (!gameState) return;


    // -----------------------------------------
    // إذا انتهت الجولة
    // -----------------------------------------

    if (gameState.winner) {

        showWinner(gameState.winner);

        return;
    }


    // -----------------------------------------
    // إذا بدأت اللعبة
    // -----------------------------------------

    if (gameState.gameStarted) {

        showScreen(mazeScreen);

        renderMaze();

        renderMazePlayers();

        mazePlayerCount.textContent =
            gameState.players.length;

        return;
    }


    // -----------------------------------------
    // مرحلة التسجيل
    // -----------------------------------------

    showScreen(registrationScreen);

    renderRegistrationPlayers();

}


// =========================================
// رسم قائمة التسجيل
// =========================================

function renderRegistrationPlayers() {

    const players =
        gameState.players || [];


    playerCount.textContent =
        `${players.length} / 20`;


    if (players.length === 0) {

        registrationPlayers.innerHTML = `
            <div class="empty-players">
                في انتظار اللاعبين...
            </div>
        `;

        return;
    }


    registrationPlayers.innerHTML = "";


    players.forEach((player, index) => {

        const item =
            document.createElement("div");

        item.className =
            "registration-player";


        const avatar =
            document.createElement("img");

        avatar.className =
            "registration-avatar";

        avatar.src =
            player.profilePictureUrl || "";

        avatar.alt =
            player.nickname || "Player";


        avatar.onerror = () => {

            avatar.style.display = "none";

        };


        const info =
            document.createElement("div");

        info.className =
            "registration-player-info";


        const number =
            document.createElement("span");

        number.className =
            "registration-number";

        number.textContent =
            `#${index + 1}`;


        const name =
            document.createElement("span");

        name.className =
            "registration-name";

        name.textContent =
            player.nickname || "مستخدم";


        const username =
            document.createElement("span");

        username.className =
            "registration-username";

        username.textContent =
            player.uniqueId
                ? `@${player.uniqueId}`
                : "";


        info.appendChild(number);
        info.appendChild(name);
        info.appendChild(username);


        item.appendChild(avatar);
        item.appendChild(info);


        registrationPlayers.appendChild(item);

    });


    if (players.length >= 20) {

        registrationMessage.textContent =
            "🔒 اكتمل العدد! اضغط بدء اللعب.";

    } else {

        registrationMessage.textContent =
            "🟢 التسجيل مفتوح — أرسل JOIN للانضمام.";

    }

}


// =========================================
// رسم المتاهة
// =========================================

function renderMaze() {

    maze.innerHTML = "";


    if (!gameState.maze ||
        gameState.maze.length === 0) {

        return;
    }


    const size =
        gameState.maze.length;

    const cellSize =
        300 / size;


    // -----------------------------------------
    // خلفية
    // -----------------------------------------

    const background =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
        );

    background.setAttribute(
        "x",
        0
    );

    background.setAttribute(
        "y",
        0
    );

    background.setAttribute(
        "width",
        300
    );

    background.setAttribute(
        "height",
        300
    );

    background.setAttribute(
        "fill",
        "transparent"
    );

    maze.appendChild(background);


    // -----------------------------------------
    // الجدران
    // -----------------------------------------

    gameState.maze.forEach((row, y) => {

        row.forEach((cell, x) => {

            const x1 =
                x * cellSize;

            const y1 =
                y * cellSize;

            const x2 =
                x1 + cellSize;

            const y2 =
                y1 + cellSize;


            if (cell.walls.top) {

                drawWall(
                    x1,
                    y1,
                    x2,
                    y1
                );

            }


            if (cell.walls.right) {

                drawWall(
                    x2,
                    y1,
                    x2,
                    y2
                );

            }


            if (cell.walls.bottom) {

                drawWall(
                    x1,
                    y2,
                    x2,
                    y2
                );

            }


            if (cell.walls.left) {

                drawWall(
                    x1,
                    y1,
                    x1,
                    y2
                );

            }

        });

    });


    // -----------------------------------------
    // الكنز
    // -----------------------------------------

    if (gameState.treasure) {

        const treasure =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );


        treasure.setAttribute(
            "x",
            gameState.treasure.x * cellSize +
            cellSize / 2
        );


        treasure.setAttribute(
            "y",
            gameState.treasure.y * cellSize +
            cellSize * 0.72
        );


        treasure.setAttribute(
            "text-anchor",
            "middle"
        );


        treasure.setAttribute(
            "font-size",
            Math.max(10, cellSize * 0.75)
        );


        treasure.textContent =
            "🎁";


        treasure.classList.add(
            "treasure"
        );


        maze.appendChild(treasure);

    }

}


// =========================================
// رسم جدار
// =========================================

function drawWall(x1, y1, x2, y2) {

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


    line.classList.add(
        "maze-wall"
    );


    maze.appendChild(line);

}


// =========================================
// رسم اللاعبين داخل المتاهة
// =========================================

function renderMazePlayers() {

    if (!gameState.players) return;


    const size =
        gameState.maze.length;

    if (!size) return;


    const cellSize =
        300 / size;


    gameState.players.forEach(player => {

        if (
            typeof player.x !== "number" ||
            typeof player.y !== "number"
        ) {
            return;
        }


        const group =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "g"
            );


        group.classList.add(
            "maze-player"
        );


        const cx =
            player.x * cellSize +
            cellSize / 2;

        const cy =
            player.y * cellSize +
            cellSize / 2;


        // دائرة خلف الصورة

        const circle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );


        circle.setAttribute(
            "cx",
            cx
        );

        circle.setAttribute(
            "cy",
            cy
        );

        circle.setAttribute(
            "r",
            Math.max(5, cellSize * 0.38)
        );


        group.appendChild(
            circle
        );


        // صورة اللاعب

        if (player.profilePictureUrl) {

            const image =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "image"
                );


            const sizeImg =
                Math.max(
                    8,
                    cellSize * 0.65
                );


            image.setAttribute(
                "x",
                cx - sizeImg / 2
            );

            image.setAttribute(
                "y",
                cy - sizeImg / 2
            );

            image.setAttribute(
                "width",
                sizeImg
            );

            image.setAttribute(
                "height",
                sizeImg
            );

            image.setAttribute(
                "href",
                player.profilePictureUrl
            );


            image.setAttribute(
                "preserveAspectRatio",
                "xMidYMid slice"
            );


            group.appendChild(
                image
            );

        } else {

            const text =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text"
                );


            text.setAttribute(
                "x",
                cx
            );

            text.setAttribute(
                "y",
                cy + 4
            );

            text.setAttribute(
                "text-anchor",
                "middle"
            );

            text.setAttribute(
                "font-size",
                Math.max(
                    8,
                    cellSize * 0.5
                )
            );


            text.textContent =
                "👤";


            group.appendChild(
                text
            );

        }


        // اسم اللاعب

        const name =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );


        name.setAttribute(
            "x",
            cx
        );

        name.setAttribute(
            "y",
            cy + cellSize * 0.48
        );

        name.setAttribute(
            "text-anchor",
            "middle"
        );

        name.setAttribute(
            "font-size",
            Math.max(
                5,
                cellSize * 0.32
            )
        );


        name.textContent =
            player.nickname || "";


        name.classList.add(
            "player-name"
        );


        group.appendChild(
            name
        );


        maze.appendChild(
            group
        );

    });

}


// =========================================
// شاشة الفائز
// =========================================

function showWinner(winner) {

    showScreen(winnerScreen);


    winnerName.textContent =
        winner.nickname ||
        winner.uniqueId ||
        "الفائز";


    winnerAvatar.innerHTML = "";


    if (winner.profilePictureUrl) {

        const img =
            document.createElement("img");


        img.src =
            winner.profilePictureUrl;


        img.alt =
            winner.nickname || "Winner";


        img.onerror = () => {

            winnerAvatar.textContent =
                "👤";

        };


        winnerAvatar.appendChild(
            img
        );

    } else {

        winnerAvatar.textContent =
            "👤";

    }

}


// =========================================
// حماية النصوص
// =========================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value || "";

    return div.innerHTML;

}
