const socket = io();

const playersContainer =
    document.getElementById("registrationPlayers");

const playerCount =
    document.getElementById("playerCount");

const startButton =
    document.getElementById("startButton");

const registrationMessage =
    document.getElementById("registrationMessage");

const connectionStatus =
    document.getElementById("connectionStatus");


/* =========================================
   CONNECTION
========================================= */

socket.on("connect", () => {

    connectionStatus.textContent =
        "🟢 متصل";

});


socket.on("disconnect", () => {

    connectionStatus.textContent =
        "🔴 غير متصل";

});


/* =========================================
   RECEIVE GAME STATE
========================================= */

socket.on("game_state", (state) => {

    if (!state) return;

    const players = state.players || [];

    renderPlayers(players);

});


/* =========================================
   RENDER PLAYERS
========================================= */

function renderPlayers(players) {

    playerCount.textContent =
        `${players.length} / 20`;

    playersContainer.innerHTML = "";

    if (players.length === 0) {

        playersContainer.innerHTML = `
            <div class="empty-players">
                في انتظار اللاعبين...
            </div>
        `;

        registrationMessage.textContent =
            "في انتظار اللاعبين...";

        startButton.disabled = true;

        return;
    }


    registrationMessage.textContent =
        `تم تسجيل ${players.length} لاعب`;

    startButton.disabled = false;


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
            player.nickname || "لاعب";


        avatar.onerror = () => {

            avatar.style.display = "none";

            fallback.style.display = "flex";

        };


        const fallback =
            document.createElement("div");

        fallback.className =
            "registration-avatar fallback-avatar";

        fallback.textContent = "👤";

        fallback.style.display =
            player.profilePictureUrl
                ? "none"
                : "flex";


        const info =
            document.createElement("div");

        info.className =
            "registration-player-info";


        const name =
            document.createElement("div");

        name.className =
            "registration-player-name";

        name.textContent =
            player.nickname || "مستخدم";


        const username =
            document.createElement("div");

        username.className =
            "registration-player-username";

        username.textContent =
            "@" + (
                player.uniqueId || "unknown"
            );


        info.appendChild(name);
        info.appendChild(username);


        const number =
            document.createElement("div");

        number.className =
            "registration-player-number";

        number.textContent =
            index + 1;


        item.appendChild(avatar);
        item.appendChild(fallback);
        item.appendChild(info);
        item.appendChild(number);


        playersContainer.appendChild(item);

    });

}


/* =========================================
   START GAME
========================================= */

startButton.addEventListener("click", () => {

    if (startButton.disabled) return;

    startButton.disabled = true;

    startButton.textContent =
        "⏳ جاري بدء اللعبة...";

    registrationMessage.textContent =
        "جاري تجهيز المتاهة...";

    socket.emit("start_game");

});


/* =========================================
   GAME STARTED
========================================= */

socket.on("game_started", () => {

    window.location.href =
        "/game.html";

});


/* =========================================
   ERRORS
========================================= */

socket.on("game_error", (message) => {

    startButton.disabled = false;

    startButton.textContent =
        "▶️ بدء اللعب";

    registrationMessage.textContent =
        message || "حدث خطأ";

});


/* =========================================
   INITIAL STATE
========================================= */

startButton.disabled = true;
