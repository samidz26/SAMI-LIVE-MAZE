const socket = io();

/* =====================================================
   ELEMENTS
===================================================== */

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

const treasureSettingsBox =
    document.getElementById("treasureSettings");

const chaseSettingsBox =
    document.getElementById("chaseSettings");

const treasureDuration =
    document.getElementById("treasureDuration");

const roundDuration =
    document.getElementById("roundDuration");

const monsterCount =
    document.getElementById("monsterCount");

const monsterSpeed =
    document.getElementById("monsterSpeed");


/* =====================================================
   STATE
===================================================== */

let players = [];

let registrationOpen =
    true;

let currentGameMode =
    "treasure";

let currentJoinKeyword =
    "JOIN";


/* =====================================================
   SOCKET
===================================================== */

socket.on("connect", () => {

    connectionStatus.textContent =
        "🟢 متصل";

});


socket.on("disconnect", () => {

    connectionStatus.textContent =
        "🔴 غير متصل";

});


/* =====================================================
   GAME STATE
===================================================== */

socket.on(
    "game_state",
    state => {

        if (!state) return;


        players =
            state.players || [];


        registrationOpen =
            state.registrationOpen !== false;


        currentGameMode =
            state.gameMode ||
            "treasure";


        currentJoinKeyword =
            state.joinKeyword ||
            "JOIN";


        if (
            state.treasureSettings
        ) {

            treasureDuration.value =
                state.treasureSettings.duration;

        }


        if (
            state.chaseSettings
        ) {

            roundDuration.value =
                state.chaseSettings.roundDuration;

            monsterCount.value =
                state.chaseSettings.monsterCount;

            monsterSpeed.value =
                state.chaseSettings.monsterSpeed;

        }


        renderPlayers(
            players
        );


        updateRegistrationUI();

        updateKeywordUI();

        updateModeUI();

    }
);


/* =====================================================
   RENDER PLAYERS
===================================================== */

function renderPlayers(list) {

    playerCount.textContent =
        `${list.length} / 20`;

    playersContainer.innerHTML =
        "";


    if (
        list.length === 0
    ) {

        playersContainer.innerHTML = `

            <div class="empty-players">

                في انتظار اللاعبين...

            </div>

        `;

        startButton.disabled =
            true;

        registrationMessage.textContent =
            registrationOpen
                ? "في انتظار اللاعبين..."
                : "التسجيل مغلق";

        return;

    }


    startButton.disabled =
        false;


    registrationMessage.textContent =
        registrationOpen
            ? `تم تسجيل ${list.length} لاعب`
            : `جاهز للعب — ${list.length} لاعب`;


    list.forEach(
        (player, index) => {

            const item =
                document.createElement("div");

            item.className =
                "registration-player";


            /* AVATAR */

            const avatar =
                document.createElement("img");

            avatar.className =
                "registration-avatar";

            avatar.src =
                player.profilePictureUrl ||
                "";

            avatar.alt =
                player.nickname ||
                "لاعب";


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


            avatar.onerror =
                () => {

                    avatar.style.display =
                        "none";

                    fallback.style.display =
                        "flex";

                };


            /* INFO */

            const info =
                document.createElement("div");

            info.className =
                "registration-player-info";


            const name =
                document.createElement("div");

            name.className =
                "registration-player-name";

            name.textContent =
                player.nickname ||
                "مستخدم";


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


            /* NUMBER */

            const number =
                document.createElement("div");

            number.className =
                "registration-player-number";

            number.textContent =
                index + 1;


            /* DELETE */

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

                    socket.emit(
                        "remove_player",
                        player.uniqueId
                    );

                }
            );


            item.appendChild(
                avatar
            );

            item.appendChild(
                fallback
            );

            item.appendChild(
                info
            );

            item.appendChild(
                number
            );

            item.appendChild(
                deleteButton
            );


            playersContainer.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   REGISTRATION TOGGLE
===================================================== */

registrationToggle.addEventListener(
    "click",
    () => {

        socket.emit(
            "toggle_registration"
        );

    }
);


/* =====================================================
   REGISTRATION UI
===================================================== */

function updateRegistrationUI() {

    if (
        registrationOpen
    ) {

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

}


/* =====================================================
   KEYWORD
===================================================== */

saveKeywordButton.addEventListener(
    "click",
    saveKeyword
);


joinKeyword.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            saveKeyword();

        }

    }
);


function saveKeyword() {

    let keyword =
        joinKeyword.value
            .trim()
            .toUpperCase();


    if (!keyword) {

        alert(
            "أدخل كلمة التسجيل"
        );

        return;

    }


    socket.emit(
        "set_join_keyword",
        keyword
    );

}


socket.on(
    "join_keyword_updated",
    keyword => {

        currentJoinKeyword =
            keyword ||
            "JOIN";

        updateKeywordUI();

    }
);


function updateKeywordUI() {

    joinKeyword.value =
        currentJoinKeyword;

    currentKeyword.textContent =
        currentJoinKeyword;

}


/* =====================================================
   GAME MODE
===================================================== */

gameMode.addEventListener(
    "change",
    () => {

        socket.emit(
            "set_game_mode",
            gameMode.value
        );

    }
);


function updateModeUI() {

    gameMode.value =
        currentGameMode;


    if (
        currentGameMode === "treasure"
    ) {

        treasureSettingsBox.classList.remove(
            "hidden-mode"
        );

        chaseSettingsBox.classList.add(
            "hidden-mode"
        );

    }

    else if (
        currentGameMode === "chase"
    ) {

        treasureSettingsBox.classList.add(
            "hidden-mode"
        );

        chaseSettingsBox.classList.remove(
            "hidden-mode"
        );

    }

    else {

        treasureSettingsBox.classList.add(
            "hidden-mode"
        );

        chaseSettingsBox.classList.add(
            "hidden-mode"
        );

    }

}


/* =====================================================
   TREASURE SETTINGS
===================================================== */

treasureDuration.addEventListener(
    "change",
    saveTreasureSettings
);


function saveTreasureSettings() {

    const duration =
        Number(
            treasureDuration.value
        );


    if (
        !Number.isFinite(duration) ||
        duration < 1 ||
        duration > 300
    ) {

        alert(
            "مدة ظهور الكنز يجب أن تكون بين 1 و 300 ثانية"
        );

        treasureDuration.value =
            10;

        return;

    }


    socket.emit(
        "set_treasure_settings",
        {
            duration
        }
    );

}


/* =====================================================
   CHASE SETTINGS
===================================================== */

roundDuration.addEventListener(
    "change",
    saveChaseSettings
);


monsterCount.addEventListener(
    "change",
    saveChaseSettings
);


monsterSpeed.addEventListener(
    "change",
    saveChaseSettings
);


function saveChaseSettings() {

    const settings = {

        roundDuration:
            Number(
                roundDuration.value
            ),

        monsterCount:
            Number(
                monsterCount.value
            ),

        monsterSpeed:
            Number(
                monsterSpeed.value
            )

    };


    if (
        !Number.isFinite(
            settings.roundDuration
        ) ||
        settings.roundDuration < 10 ||
        settings.roundDuration > 3600
    ) {

        alert(
            "مدة الجولة يجب أن تكون بين 10 و 3600 ثانية"
        );

        return;

    }


    if (
        !Number.isFinite(
            settings.monsterCount
        ) ||
        settings.monsterCount < 1 ||
        settings.monsterCount > 10
    ) {

        alert(
            "عدد الوحوش يجب أن يكون بين 1 و 10"
        );

        return;

    }


    if (
        !Number.isFinite(
            settings.monsterSpeed
        ) ||
        settings.monsterSpeed < 100 ||
        settings.monsterSpeed > 10000
    ) {

        alert(
            "سرعة الوحش يجب أن تكون بين 100 و 10000 ms"
        );

        return;

    }


    socket.emit(
        "set_chase_settings",
        settings
    );

}


/* =====================================================
   START GAME
===================================================== */

startButton.addEventListener(
    "click",
    () => {

        if (
            players.length === 0
        ) {

            return;

        }


        startButton.disabled =
            true;

        startButton.textContent =
            "⏳ جاري تجهيز اللعبة...";


        registrationMessage.textContent =
            "جاري تجهيز المتاهة...";


        socket.emit(
            "start_game"
        );

    }
);


/* =====================================================
   GAME STARTED
===================================================== */

socket.on(
    "game_started",
    () => {

        window.location.href =
            "/game.html";

    }
);


/* =====================================================
   ERROR
===================================================== */

socket.on(
    "game_error",
    message => {

        startButton.disabled =
            players.length === 0;

        startButton.textContent =
            "▶️ بدء اللعب";

        registrationMessage.textContent =
            message ||
            "حدث خطأ";

    }
);


/* =====================================================
   INITIAL
===================================================== */

updateRegistrationUI();

updateKeywordUI();

updateModeUI();
