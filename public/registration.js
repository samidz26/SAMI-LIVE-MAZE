const socket = io();

const gameMode = document.getElementById("gameMode");

const modeButtons = document.querySelectorAll(".game-mode-option");

const treasureSettings = document.getElementById("treasureSettings");
const chaseSettings = document.getElementById("chaseSettings");
const nahroushSettings = document.getElementById("nahroushSettings");

const treasureDuration = document.getElementById("treasureDuration");
const roundDuration = document.getElementById("roundDuration");
const monsterCount = document.getElementById("monsterCount");
const monsterSpeed = document.getElementById("monsterSpeed");

const nahroushUsername =
    document.getElementById("nahroushUsername");

const joinKeyword =
    document.getElementById("joinKeyword");

const joinKeywordDisplay =
    document.getElementById("joinKeywordDisplay");

const registrationToggle =
    document.getElementById("registrationToggle");

const maxPlayers =
    document.getElementById("maxPlayers");

const playersList =
    document.getElementById("playersList");

const playersCount =
    document.getElementById("playersCount");

const playersMax =
    document.getElementById("playersMax");

const startGameButton =
    document.getElementById("startGameButton");

const startMessage =
    document.getElementById("startMessage");

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");


let currentGameMode = "treasure";
let registrationOpen = true;


/* =========================================
   INITIAL UI
========================================= */

updateModeUI();

if (joinKeyword) {
    joinKeyword.addEventListener("input", () => {

        let value = joinKeyword.value.trim();

        if (!value) {
            value = "JOIN";
        }

        joinKeywordDisplay.textContent = value.toUpperCase();

        socket.emit(
            "set_join_keyword",
            value
        );
    });
}


if (maxPlayers) {

    maxPlayers.addEventListener("change", () => {

        let value =
            parseInt(maxPlayers.value, 10);

        if (isNaN(value)) {
            value = 20;
        }

        value = Math.max(1, Math.min(20, value));

        maxPlayers.value = value;

        playersMax.textContent = value;

        socket.emit(
            "set_max_players",
            value
        );
    });
}


/* =========================================
   GAME MODE BUTTONS
========================================= */

modeButtons.forEach(button => {

    button.addEventListener("click", () => {

        if (button.disabled) {
            return;
        }

        const mode =
            button.dataset.mode;

        if (
            mode !== "treasure" &&
            mode !== "chase" &&
            mode !== "nahroush"
        ) {
            return;
        }

        currentGameMode = mode;

        gameMode.value = mode;

        updateModeUI();

        socket.emit(
            "set_game_mode",
            mode
        );
    });

});


/* =========================================
   MODE UI
========================================= */

function updateModeUI() {

    modeButtons.forEach(button => {

        const mode =
            button.dataset.mode;

        button.classList.toggle(
            "active",
            mode === currentGameMode
        );

    });


    treasureSettings.classList.toggle(
        "hidden",
        currentGameMode !== "treasure"
    );


    chaseSettings.classList.toggle(
        "hidden",
        currentGameMode !== "chase"
    );


    nahroushSettings.classList.toggle(
        "hidden",
        currentGameMode !== "nahroush"
    );
}


/* =========================================
   TREASURE SETTINGS
========================================= */

if (treasureDuration) {

    treasureDuration.addEventListener(
        "change",
        () => {

            let value =
                parseInt(
                    treasureDuration.value,
                    10
                );

            if (isNaN(value)) {
                value = 10;
            }

            value = Math.max(
                1,
                Math.min(300, value)
            );

            treasureDuration.value =
                value;

            socket.emit(
                "set_treasure_duration",
                value
            );

        }
    );
}


/* =========================================
   CHASE SETTINGS
========================================= */

if (roundDuration) {

    roundDuration.addEventListener(
        "change",
        () => {

            let value =
                parseInt(
                    roundDuration.value,
                    10
                );

            if (isNaN(value)) {
                value = 60;
            }

            value = Math.max(
                10,
                Math.min(600, value)
            );

            roundDuration.value =
                value;

            socket.emit(
                "set_round_duration",
                value
            );

        }
    );
}


if (monsterCount) {

    monsterCount.addEventListener(
        "change",
        () => {

            let value =
                parseInt(
                    monsterCount.value,
                    10
                );

            if (isNaN(value)) {
                value = 1;
            }

            value = Math.max(
                1,
                Math.min(10, value)
            );

            monsterCount.value =
                value;

            socket.emit(
                "set_monster_count",
                value
            );

        }
    );
}


if (monsterSpeed) {

    monsterSpeed.addEventListener(
        "change",
        () => {

            let value =
                parseInt(
                    monsterSpeed.value,
                    10
                );

            if (isNaN(value)) {
                value = 1000;
            }

            value = Math.max(
                200,
                Math.min(5000, value)
            );

            monsterSpeed.value =
                value;

            socket.emit(
                "set_monster_speed",
                value
            );

        }
    );
}


/* =========================================
   NAHROUSH USERNAME
========================================= */

if (nahroushUsername) {

    nahroushUsername.addEventListener(
        "input",
        () => {

            let value =
                nahroushUsername.value
                    .trim()
                    .replace(/^@+/, "")
                    .toLowerCase();

            nahroushUsername.value =
                value;

            socket.emit(
                "set_nahroush_username",
                value
            );

        }
    );

}


/* =========================================
   REGISTRATION TOGGLE
========================================= */

if (registrationToggle) {

    registrationToggle.addEventListener(
        "click",
        () => {

            registrationOpen =
                !registrationOpen;

            socket.emit(
                "set_registration",
                registrationOpen
            );

            updateRegistrationButton();

        }
    );

}


function updateRegistrationButton() {

    if (registrationOpen) {

        registrationToggle.textContent =
            "التسجيل مفتوح";

        registrationToggle.classList.add(
            "active"
        );

    } else {

        registrationToggle.textContent =
            "التسجيل مغلق";

        registrationToggle.classList.remove(
            "active"
        );

    }

}


/* =========================================
   PLAYERS
========================================= */

socket.on(
    "players_update",
    players => {

        renderPlayers(players);

    }
);


function renderPlayers(players) {

    if (!Array.isArray(players)) {
        return;
    }

    playersCount.textContent =
        players.length;

    playersList.innerHTML = "";

    players.forEach(player => {

        const item =
            document.createElement("div");

        item.className =
            "player-item";

        if (player.isNahroush) {
            item.classList.add(
                "nahroush-player"
            );
        }


        const avatar =
            document.createElement("img");

        avatar.className =
            "player-avatar";

        avatar.src =
            player.profilePictureUrl || "";

        avatar.alt =
            player.nickname || player.uniqueId || "لاعب";


        avatar.onerror = () => {

            avatar.style.display =
                "none";

        };


        const information =
            document.createElement("div");

        information.className =
            "player-information";


        const name =
            document.createElement("div");

        name.className =
            "player-name";

        name.textContent =
            player.nickname ||
            player.uniqueId ||
            "مستخدم";


        const username =
            document.createElement("div");

        username.className =
            "player-username";

        username.textContent =
            "@" +
            (
                player.uniqueId ||
                ""
            );


        information.appendChild(name);
        information.appendChild(username);


        if (player.isNahroush) {

            const role =
                document.createElement("div");

            role.className =
                "player-role";

            role.textContent =
                "👑 نهروش";

            information.appendChild(role);

        }


        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "player-delete";

        deleteButton.type =
            "button";

        deleteButton.textContent =
            "✕";

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


        item.appendChild(avatar);
        item.appendChild(information);
        item.appendChild(deleteButton);

        playersList.appendChild(item);

    });

}


/* =========================================
   START GAME
========================================= */

startGameButton.addEventListener(
    "click",
    () => {

        startMessage.textContent =
            "";

        startGameButton.disabled =
            true;

        socket.emit(
            "start_game",
            response => {

                startGameButton.disabled =
                    false;

                if (
                    response &&
                    response.success
                ) {

                    window.location.href =
                        "/game.html";

                    return;
                }


                startMessage.textContent =
                    response?.message ||
                    "تعذر بدء اللعبة.";

            }
        );

    }
);


/* =========================================
   SERVER STATE
========================================= */

socket.on(
    "game_state",
    state => {

        if (!state) {
            return;
        }


        if (state.gameMode) {

            currentGameMode =
                state.gameMode;

            gameMode.value =
                state.gameMode;

            updateModeUI();

        }


        if (
            typeof state.registrationOpen ===
            "boolean"
        ) {

            registrationOpen =
                state.registrationOpen;

            updateRegistrationButton();

        }


        if (
            state.joinKeyword
        ) {

            joinKeyword.value =
                state.joinKeyword;

            joinKeywordDisplay.textContent =
                state.joinKeyword.toUpperCase();

        }


        if (
            state.maxPlayers
        ) {

            maxPlayers.value =
                state.maxPlayers;

            playersMax.textContent =
                state.maxPlayers;

        }


        if (
            state.nahroushUsername
        ) {

            nahroushUsername.value =
                state.nahroushUsername;

        }


        if (
            state.treasureSettings
        ) {

            treasureDuration.value =
                state.treasureSettings
                    .duration;

        }


        if (
            state.chaseSettings
        ) {

            roundDuration.value =
                state.chaseSettings
                    .roundDuration;

            monsterCount.value =
                state.chaseSettings
                    .monsterCount;

            monsterSpeed.value =
                state.chaseSettings
                    .monsterSpeed;

        }


        if (state.players) {

            renderPlayers(
                state.players
            );

        }

    }
);


/* =========================================
   CONNECTION STATUS
========================================= */

socket.on(
    "connect",
    () => {

        connectionDot.classList.add(
            "connected"
        );

        connectionText.textContent =
            "متصل";

    }
);


socket.on(
    "disconnect",
    () => {

        connectionDot.classList.remove(
            "connected"
        );

        connectionText.textContent =
            "غير متصل";

    }
);


/* =========================================
   SERVER ERRORS
========================================= */

socket.on(
    "error_message",
    message => {

        startMessage.textContent =
            message || "";

    }
);
