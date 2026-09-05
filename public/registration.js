const socket = io();


/* =========================================
   ELEMENTS
========================================= */

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

const joinKeyword =
    document.getElementById("joinKeyword");

const currentKeyword =
    document.getElementById("currentKeyword");

const saveKeywordButton =
    document.getElementById("saveKeywordButton");

const registrationToggle =
    document.getElementById("registrationToggle");

const registrationStatusText =
    document.getElementById("registrationStatusText");

const gameMode =
    document.getElementById("gameMode");


/* =========================================
   LOCAL STATE
========================================= */

let players = [];

let registrationOpen = true;

let currentGameMode = "treasure";

let currentJoinKeyword = "JOIN";


/* =========================================
   SOCKET CONNECTED
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
   GAME STATE
========================================= */

socket.on("game_state", (state) => {

    if (!state) return;


    players =
        state.players || [];


    registrationOpen =
        state.registrationOpen !== false;


    currentGameMode =
        state.gameMode || "treasure";


    currentJoinKeyword =
        state.joinKeyword || "JOIN";


    renderPlayers(players);

    updateRegistrationUI();

    updateModeUI();

});


/* =========================================
   RENDER PLAYERS
========================================= */

function renderPlayers(list) {

    playerCount.textContent =
        `${list.length} / 20`;


    playersContainer.innerHTML = "";


    if (list.length === 0) {

        playersContainer.innerHTML = `
            <div class="empty-players">
                في انتظار اللاعبين...
            </div>
        `;

        startButton.disabled = true;

        registrationMessage.textContent =
            registrationOpen
                ? "في انتظار اللاعبين..."
                : "التسجيل مغلق";

        return;
    }


    /*
        يوجد لاعبون
    */

    startButton.disabled =
        !registrationOpen;


    registrationMessage.textContent =
        registrationOpen
            ? `تم تسجيل ${list.length} لاعب`
            : `تم تسجيل ${list.length} لاعب — التسجيل مغلق`;


    list.forEach((player, index) => {

        const item =
            document.createElement("div");

        item.className =
            "registration-player";


        /* صورة */

        const avatar =
            document.createElement("img");

        avatar.className =
            "registration-avatar";

        avatar.src =
            player.profilePictureUrl || "";

        avatar.alt =
            player.nickname || "لاعب";


        const fallback =
            document.createElement("div");

        fallback.className =
            "registration-avatar fallback-avatar";

        fallback.textContent =
            "👤";

        fallback.style.display =
            player.profilePictureUrl
                ? "none"
                : "flex";


        avatar.onerror = () => {

            avatar.style.display =
                "none";

            fallback.style.display =
                "flex";

        };


        /* معلومات اللاعب */

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
            "@" +
            (
                player.uniqueId ||
                "unknown"
            );


        info.appendChild(name);
        info.appendChild(username);


        /* رقم اللاعب */

        const number =
            document.createElement("div");

        number.className =
            "registration-player-number";

        number.textContent =
            index + 1;


        /* زر الحذف */

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "delete-player-button";

        deleteButton.textContent =
            "🗑";


        deleteButton.title =
            "حذف اللاعب";


        deleteButton.addEventListener(
            "click",
            () => {

                deletePlayer(
                    player.uniqueId
                );

            }
        );


        /* إضافة العناصر */

        item.appendChild(avatar);

        item.appendChild(fallback);

        item.appendChild(info);

        item.appendChild(number);

        item.appendChild(deleteButton);


        playersContainer.appendChild(item);

    });

}


/* =========================================
   DELETE PLAYER
========================================= */

function deletePlayer(uniqueId) {

    if (!uniqueId) return;


    socket.emit(
        "remove_player",
        uniqueId
    );

}


/* =========================================
   REGISTRATION OPEN / CLOSE
========================================= */

registrationToggle.addEventListener(
    "click",
    () => {

        socket.emit(
            "toggle_registration"
        );

    }
);


/* =========================================
   UPDATE REGISTRATION UI
========================================= */

function updateRegistrationUI() {

    if (registrationOpen) {

        registrationToggle.className =
            "registration-toggle open";

        registrationToggle.textContent =
            "🟢 التسجيل مفتوح";

        registrationStatusText.textContent =
            "التسجيل مفتوح";

    }

    else {

        registrationToggle.className =
            "registration-toggle closed";

        registrationToggle.textContent =
            "🔴 التسجيل مغلق";

        registrationStatusText.textContent =
            "التسجيل مغلق";

    }


    startButton.disabled =
        players.length === 0;


    /*
        بعد إغلاق التسجيل يمكن بدء اللعبة
    */

    if (!registrationOpen &&
        players.length > 0) {

        startButton.disabled =
            false;

        registrationMessage.textContent =
            `جاهز للعب — ${players.length} لاعب`;

    }

}


/* =========================================
   SAVE JOIN KEYWORD
========================================= */

saveKeywordButton.addEventListener(
    "click",
    saveKeyword
);


joinKeyword.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            saveKeyword();

        }

    }
);


function saveKeyword() {

    let keyword =
        joinKeyword.value.trim();


    if (!keyword) {

        alert(
            "يجب إدخال كلمة التسجيل"
        );

        return;

    }


    if (keyword.length > 20) {

        alert(
            "كلمة التسجيل طويلة جدًا"
        );

        return;

    }


    keyword =
        keyword.toUpperCase();


    socket.emit(
        "set_join_keyword",
        keyword
    );

}


/* =========================================
   UPDATE KEYWORD UI
========================================= */

function updateKeywordUI() {

    joinKeyword.value =
        currentJoinKeyword;

    currentKeyword.textContent =
        currentJoinKeyword;

}


/* =========================================
   SERVER CONFIRMED KEYWORD
========================================= */

socket.on(
    "join_keyword_updated",
    (keyword) => {

        currentJoinKeyword =
            keyword || "JOIN";

        updateKeywordUI();

    }
);


/* =========================================
   GAME MODE
========================================= */

gameMode.addEventListener(
    "change",
    () => {

        const mode =
            gameMode.value;


        socket.emit(
            "set_game_mode",
            mode
        );

    }
);


/* =========================================
   UPDATE MODE UI
========================================= */

function updateModeUI() {

    gameMode.value =
        currentGameMode;

}


/* =========================================
   GAME MODE CONFIRMED
========================================= */

socket.on(
    "game_mode_updated",
    (mode) => {

        currentGameMode =
            mode || "treasure";

        updateModeUI();

    }
);


/* =========================================
   START GAME
========================================= */

startButton.addEventListener(
    "click",
    () => {

        if (players.length === 0) {

            return;

        }


        startButton.disabled =
            true;


        startButton.textContent =
            "⏳ جاري بدء اللعبة...";


        registrationMessage.textContent =
            "جاري تجهيز المتاهة...";


        socket.emit(
            "start_game"
        );

    }
);


/* =========================================
   GAME STARTED
========================================= */

socket.on(
    "game_started",
    () => {

        window.location.href =
            "/game.html";

    }
);


/* =========================================
   SERVER ERROR
========================================= */

socket.on(
    "game_error",
    (message) => {

        startButton.disabled =
            players.length === 0;

        startButton.textContent =
            "▶️ بدء اللعب";


        registrationMessage.textContent =
            message ||
            "حدث خطأ أثناء تنفيذ العملية";

    }
);


/* =========================================
   INITIAL UI
========================================= */

updateRegistrationUI();

updateKeywordUI();

updateModeUI();
