document.body.insertAdjacentHTML(
    "afterbegin",
    '<div id="jsTest" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:red;color:white;padding:15px;text-align:center;font-size:20px;">GAME.JS WORKING</div>'
);const socket = io();

/* =====================================================
   ELEMENTS
===================================================== */

const mazeSvg =
    document.getElementById("maze");

const gameTimer =
    document.getElementById("gameTimer");

const timerIcon =
    document.getElementById("timerIcon");

const timerValue =
    document.getElementById("timerValue");

const winnerOverlay =
    document.getElementById("winnerOverlay");

const winnerIcon =
    document.getElementById("winnerIcon");

const winnerSubtitle =
    document.getElementById("winnerSubtitle");

const winnerAvatar =
    document.getElementById("winnerAvatar");

const winnerName =
    document.getElementById("winnerName");

const winnerMessage =
    document.getElementById("winnerMessage");

const resetButton =
    document.getElementById("resetButton");

const gameModeLabel =
    document.getElementById("gameModeLabel");

const gameInstructions =
    document.getElementById("gameInstructions");

const instructionTitle =
    document.getElementById("instructionTitle");

const instructionText =
    document.getElementById("instructionText");

const gameCountdown =
    document.getElementById("gameCountdown");

const countdownValue =
    document.getElementById("countdownValue");

const eliminationOverlay =
    document.getElementById("eliminationOverlay");

const eliminationAvatar =
    document.getElementById("eliminationAvatar");

const eliminationName =
    document.getElementById("eliminationName");

const gameStatus =
    document.getElementById("gameStatus");

const survivorsContainer =
    document.getElementById("survivorsContainer");

const survivorsList =
    document.getElementById("survivorsList");


/* =====================================================
   CONSTANTS
===================================================== */

const MAZE_SIZE = 12;
const CELL_SIZE = 32;

const INTRO_DURATION = 5000;
const ELIMINATION_DURATION = 1500;


/* =====================================================
   STATE
===================================================== */

let currentState = null;

let instructionTimer = null;
let countdownTimer = null;
let eliminationTimer = null;

let audioContext = null;


/* =====================================================
   SVG
===================================================== */

const SVG_NS =
    "http://www.w3.org/2000/svg";


function createSvgElement(type) {

    return document.createElementNS(
        SVG_NS,
        type
    );

}


/* =====================================================
   GAME STATE
===================================================== */

socket.on(
    "game_state",
    state => {

        if (!state) return;

        currentState = state;

        updateModeLabel(state);

        renderMaze(state);

        updateTimer(state);

    }
);


/* =====================================================
   GAME STARTED
===================================================== */

socket.on(
    "game_started",
    state => {

        if (!state) return;

        currentState = state;

        winnerOverlay.classList.add(
            "hidden"
        );

        survivorsContainer.classList.add(
            "hidden"
        );

        /*
           إعادة شكل صورة الفائز الطبيعي
           عند بدء جولة جديدة
        */
        resetWinnerAvatarStyle();

        updateModeLabel(state);

        renderMaze(state);

        updateTimer(state);

        startGameIntroduction(
            state
        );

    }
);


/* =====================================================
   GAME MODE LABEL
===================================================== */

function updateModeLabel(state) {

    if (!gameModeLabel) return;

    const mode =
        state?.gameMode;

    if (mode === "treasure") {

        gameModeLabel.textContent =
            "🏆 مود الكنز";

    }

    else if (mode === "chase") {

        gameModeLabel.textContent =
            "👹 مود النجاة";

    }

    else if (mode === "nahroush") {

        gameModeLabel.textContent =
            "🦉 مود القبض على نهروش";

    }

    else {

        gameModeLabel.textContent =
            "لعبة المتاهة";

    }

}


/* =====================================================
   GAME INTRODUCTION
===================================================== */

function startGameIntroduction(state) {

    clearIntroductionTimers();

    if (!gameInstructions) return;

    gameInstructions.classList.remove(
        "hidden"
    );

    if (state.gameMode === "treasure") {

        instructionTitle.textContent =
            "الهدف الوصول إلى الكنز";

        instructionText.textContent =
            "كن أول من يصل إلى الكنز";

    }

    else if (state.gameMode === "chase") {

        instructionTitle.textContent =
            "الهدف النجاة من الوحش سيلا حتى نهاية الوقت";

        instructionText.textContent =
            "اهرب من الوحش وحاول البقاء حتى النهاية";

    }

    else if (state.gameMode === "nahroush") {

        instructionTitle.textContent =
            "الهدف القضاء على البومة";

        instructionText.textContent =
            "احذروا من الوحش";

    }

    else {

        instructionTitle.textContent =
            "استعدوا للعب";

        instructionText.textContent =
            "تحركوا باستخدام الأوامر";

    }


    /*
       إظهار التعليمات
    */

    playSound(
        "instruction"
    );


    /*
       عد تنازلي مرئي
    */

    startCountdown();


    /*
       تختفي التعليمات بعد 5 ثوانٍ
    */

    instructionTimer =
        setTimeout(
            () => {

                gameInstructions.classList.add(
                    "hidden"
                );

            },
            INTRO_DURATION
        );

}


/* =====================================================
   COUNTDOWN
===================================================== */

function startCountdown() {

    if (!gameCountdown) return;

    clearInterval(
        countdownTimer
    );

    let value = 5;

    gameCountdown.classList.remove(
        "hidden"
    );

    countdownValue.textContent =
        value;

    playSound(
        "countdown"
    );


    countdownTimer =
        setInterval(
            () => {

                value--;

                if (value > 0) {

                    countdownValue.textContent =
                        value;

                    playSound(
                        "countdown"
                    );

                    return;

                }


                if (value === 0) {

                    countdownValue.textContent =
                        "GO!";

                    playSound(
                        "start"
                    );

                    return;

                }


                clearInterval(
                    countdownTimer
                );

                countdownTimer =
                    null;

                gameCountdown.classList.add(
                    "hidden"
                );

            },
            1000
        );

}


/* =====================================================
   CLEAR INTRO
===================================================== */

function clearIntroductionTimers() {

    if (instructionTimer) {

        clearTimeout(
            instructionTimer
        );

        instructionTimer = null;

    }


    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

        countdownTimer = null;

    }


    if (gameInstructions) {

        gameInstructions.classList.add(
            "hidden"
        );

    }


    if (gameCountdown) {

        gameCountdown.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   RENDER MAZE
===================================================== */

function renderMaze(state) {

    mazeSvg.innerHTML = "";

    const maze =
        state.maze || [];

    const players =
        state.players || [];

    const treasure =
        state.treasure;

    const monsters =
        state.monsters || [];


    const size =
        MAZE_SIZE * CELL_SIZE;


    mazeSvg.setAttribute(
        "viewBox",
        `0 0 ${size} ${size}`
    );


    /* =====================================
       BACKGROUND
    ====================================== */

    const background =
        createSvgElement("rect");

    background.setAttribute(
        "x",
        "0"
    );

    background.setAttribute(
        "y",
        "0"
    );

    background.setAttribute(
        "width",
        size
    );

    background.setAttribute(
        "height",
        size
    );

    background.setAttribute(
        "class",
        "maze-background"
    );

    mazeSvg.appendChild(
        background
    );


    /* =====================================
       WALLS
    ====================================== */

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

            const cell =
                maze[row]?.[col];

            if (!cell) continue;


            const x =
                col * CELL_SIZE;

            const y =
                row * CELL_SIZE;


            if (cell.walls?.top) {

                drawWall(
                    x,
                    y,
                    x + CELL_SIZE,
                    y
                );

            }


            if (cell.walls?.right) {

                drawWall(
                    x + CELL_SIZE,
                    y,
                    x + CELL_SIZE,
                    y + CELL_SIZE
                );

            }


            if (cell.walls?.bottom) {

                drawWall(
                    x,
                    y + CELL_SIZE,
                    x + CELL_SIZE,
                    y + CELL_SIZE
                );

            }


            if (cell.walls?.left) {

                drawWall(
                    x,
                    y,
                    x,
                    y + CELL_SIZE
                );

            }

        }

    }


    /* =====================================
       TREASURE
    ====================================== */

    if (treasure) {

        drawTreasure(
            treasure.x,
            treasure.y
        );

    }


    /* =====================================
       MONSTERS
    ====================================== */

    monsters.forEach(
        monster => {

            drawMonster(
                monster
            );

        }
    );


    /* =====================================
       PLAYERS
    ====================================== */

    players.forEach(
        (player, index) => {

            if (
                player.alive === false
            ) {
                return;
            }

            drawPlayer(
                player,
                index
            );

        }
    );

}


/* =====================================================
   WALL
===================================================== */

function drawWall(
    x1,
    y1,
    x2,
    y2
) {

    const line =
        createSvgElement("line");

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

    mazeSvg.appendChild(
        line
    );

}


/* =====================================================
   TREASURE CHEST
===================================================== */

function drawTreasure(
    col,
    row
) {

    const x =
        col * CELL_SIZE +
        CELL_SIZE / 2;

    const y =
        row * CELL_SIZE +
        CELL_SIZE / 2;


    const group =
        createSvgElement("g");

    group.setAttribute(
        "class",
        "treasure"
    );


    /* GLOW */

    const glow =
        createSvgElement("circle");

    glow.setAttribute(
        "cx",
        x
    );

    glow.setAttribute(
        "cy",
        y
    );

    glow.setAttribute(
        "r",
        14
    );

    glow.setAttribute(
        "class",
        "treasure-glow"
    );

    group.appendChild(
        glow
    );


    /* SHADOW */

    const shadow =
        createSvgElement("ellipse");

    shadow.setAttribute(
        "cx",
        x
    );

    shadow.setAttribute(
        "cy",
        y + 9
    );

    shadow.setAttribute(
        "rx",
        11
    );

    shadow.setAttribute(
        "ry",
        3
    );

    shadow.setAttribute(
        "class",
        "treasure-shadow"
    );

    group.appendChild(
        shadow
    );


    /* BODY */

    const body =
        createSvgElement("rect");

    body.setAttribute(
        "x",
        x - 10
    );

    body.setAttribute(
        "y",
        y - 2
    );

    body.setAttribute(
        "width",
        20
    );

    body.setAttribute(
        "height",
        11
    );

    body.setAttribute(
        "rx",
        2
    );

    body.setAttribute(
        "class",
        "treasure-body"
    );

    group.appendChild(
        body
    );


    /* LID */

    const lid =
        createSvgElement("path");

    lid.setAttribute(
        "d",
        `
        M ${x - 11} ${y - 4}
        Q ${x - 10} ${y - 9}
          ${x - 5} ${y - 10}
        L ${x + 5} ${y - 10}
        Q ${x + 10} ${y - 9}
          ${x + 11} ${y - 4}
        Z
        `
    );

    lid.setAttribute(
        "class",
        "treasure-lid"
    );

    group.appendChild(
        lid
    );


    /* BAND */

    const band =
        createSvgElement("rect");

    band.setAttribute(
        "x",
        x - 2
    );

    band.setAttribute(
        "y",
        y - 9
    );

    band.setAttribute(
        "width",
        4
    );

    band.setAttribute(
        "height",
        18
    );

    band.setAttribute(
        "class",
        "treasure-band"
    );

    group.appendChild(
        band
    );


    /* LOCK */

    const lock =
        createSvgElement("rect");

    lock.setAttribute(
        "x",
        x - 3
    );

    lock.setAttribute(
        "y",
        y - 1
    );

    lock.setAttribute(
        "width",
        6
    );

    lock.setAttribute(
        "height",
        5
    );

    lock.setAttribute(
        "rx",
        1
    );

    lock.setAttribute(
        "class",
        "treasure-lock"
    );

    group.appendChild(
        lock
    );


    /* SHINE */

    const shine =
        createSvgElement("circle");

    shine.setAttribute(
        "cx",
        x - 6
    );

    shine.setAttribute(
        "cy",
        y - 5
    );

    shine.setAttribute(
        "r",
        1.5
    );

    shine.setAttribute(
        "class",
        "treasure-shine"
    );

    group.appendChild(
        shine
    );


    mazeSvg.appendChild(
        group
    );

}


/* =====================================================
   MONSTER
===================================================== */

function drawMonster(monster) {

    if (
        monster.x === undefined ||
        monster.y === undefined
    ) {
        return;
    }


    const x =
        monster.x * CELL_SIZE +
        CELL_SIZE / 2;

    const y =
        monster.y * CELL_SIZE +
        CELL_SIZE / 2;


    const group =
        createSvgElement("g");

    group.setAttribute(
        "class",
        "maze-monster"
    );


    /* GLOW */

    const glow =
        createSvgElement("circle");

    glow.setAttribute(
        "cx",
        x
    );

    glow.setAttribute(
        "cy",
        y
    );

    glow.setAttribute(
        "r",
        13
    );

    glow.setAttribute(
        "class",
        "monster-glow"
    );

    group.appendChild(
        glow
    );


    /* MONSTER IMAGE */

    const image =
        createSvgElement("image");

    image.setAttribute(
        "x",
        x - 13
    );

    image.setAttribute(
        "y",
        y - 13
    );

    image.setAttribute(
        "width",
        26
    );

    image.setAttribute(
        "height",
        26
    );

    image.setAttribute(
        "preserveAspectRatio",
        "xMidYMid meet"
    );

    image.setAttribute(
        "href",
        "/monster.png"
    );


    image.onerror = () => {

        image.remove();

        const fallback =
            createSvgElement("text");

        fallback.setAttribute(
            "x",
            x
        );

        fallback.setAttribute(
            "y",
            y + 7
        );

        fallback.setAttribute(
            "text-anchor",
            "middle"
        );

        fallback.setAttribute(
            "class",
            "monster-fallback"
        );

        fallback.textContent =
            "👹";

        group.appendChild(
            fallback
        );

    };


    group.appendChild(
        image
    );

    mazeSvg.appendChild(
        group
    );

}


/* =====================================================
   PLAYER
===================================================== */

function drawPlayer(
    player,
    index
) {

    if (
        player.x === undefined ||
        player.y === undefined
    ) {
        return;
    }


    const x =
        player.x * CELL_SIZE +
        CELL_SIZE / 2;

    const y =
        player.y * CELL_SIZE +
        CELL_SIZE / 2;


    const group =
        createSvgElement("g");


    /*
       نهروش يحصل على class إضافي
    */

    if (player.isNahroush) {

        group.setAttribute(
            "class",
            "maze-player nahroush-maze-player"
        );

    } else {

        group.setAttribute(
            "class",
            "maze-player"
        );

    }


    /* =====================================
       PLAYER GLOW
    ====================================== */

    const glow =
        createSvgElement("circle");

    glow.setAttribute(
        "cx",
        x
    );

    glow.setAttribute(
        "cy",
        y
    );

    glow.setAttribute(
        "r",
        player.isNahroush
            ? 17
            : 14
    );

    glow.setAttribute(
        "class",
        player.isNahroush
            ? "player-glow nahroush-glow"
            : "player-glow"
    );

    group.appendChild(
        glow
    );


    /* =====================================
       OUTER RING
    ====================================== */

    const circle =
        createSvgElement("circle");

    circle.setAttribute(
        "cx",
        x
    );

    circle.setAttribute(
        "cy",
        y
    );

    circle.setAttribute(
        "r",
        player.isNahroush
            ? 14
            : 13
    );

    circle.setAttribute(
        "class",
        player.isNahroush
            ? "player-ring nahroush-ring"
            : "player-ring"
    );

    group.appendChild(
        circle
    );


    /* =====================================
       AVATAR
    ====================================== */

    const avatarSize =
        player.isNahroush
            ? 24
            : 22;


    if (
        player.profilePictureUrl
    ) {

        const image =
            createSvgElement("image");


        image.setAttribute(
            "x",
            x - avatarSize / 2
        );

        image.setAttribute(
            "y",
            y - avatarSize / 2
        );

        image.setAttribute(
            "width",
            avatarSize
        );

        image.setAttribute(
            "height",
            avatarSize
        );

        image.setAttribute(
            "preserveAspectRatio",
            "xMidYMid slice"
        );

        image.setAttribute(
            "href",
            player.profilePictureUrl
        );


        const clipId =
            `playerClip_${index}_${Date.now()}`;


        const defs =
            createSvgElement("defs");

        const clipPath =
            createSvgElement("clipPath");

        clipPath.setAttribute(
            "id",
            clipId
        );


        const clipCircle =
            createSvgElement("circle");

        clipCircle.setAttribute(
            "cx",
            x
        );

        clipCircle.setAttribute(
            "cy",
            y
        );

        clipCircle.setAttribute(
            "r",
            player.isNahroush
                ? 12
                : 11
        );


        clipPath.appendChild(
            clipCircle
        );

        defs.appendChild(
            clipPath
        );

        mazeSvg.appendChild(
            defs
        );


        image.setAttribute(
            "clip-path",
            `url(#${clipId})`
        );


        image.onerror = () => {

            image.remove();

        };


        group.appendChild(
            image
        );

    }

    else {

        const text =
            createSvgElement("text");

        text.setAttribute(
            "x",
            x
        );

        text.setAttribute(
            "y",
            y + 7
        );

        text.setAttribute(
            "text-anchor",
            "middle"
        );

        text.setAttribute(
            "class",
            "player-fallback"
        );

        text.textContent =
            player.isNahroush
                ? "👑"
                : "👤";

        group.appendChild(
            text
        );

    }


    /* =====================================
       NAHROUSH CROWN
    ====================================== */

    if (player.isNahroush) {

        const crown =
            createSvgElement("text");

        crown.setAttribute(
            "x",
            x + 10
        );

        crown.setAttribute(
            "y",
            y - 10
        );

        crown.setAttribute(
            "text-anchor",
            "middle"
        );

        crown.setAttribute(
            "font-size",
            "9"
        );

        crown.textContent =
            "👑";

        group.appendChild(
            crown
        );

    }


    mazeSvg.appendChild(
        group
    );

}


/* =====================================================
   TIMER
===================================================== */

function updateTimer(state) {

    /*
       وضع نهروش لا يعتمد على مؤقت
    */

    if (
        !state.gameStarted ||
        state.gameMode === "nahroush"
    ) {

        gameTimer.classList.add(
            "timer-hidden"
        );

        return;

    }


    gameTimer.classList.remove(
        "timer-hidden"
    );


    if (
        state.gameMode === "treasure"
    ) {

        timerIcon.textContent =
            "🧰";

        timerValue.textContent =
            Math.max(
                0,
                Number(
                    state.treasureTimeLeft || 0
                )
            );

    }

    else if (
        state.gameMode === "chase"
    ) {

        timerIcon.textContent =
            "⏱️";

        timerValue.textContent =
            Math.max(
                0,
                Number(
                    state.roundTimeLeft || 0
                )
            );

    }

}


/* =====================================================
   TREASURE WINNER
===================================================== */

socket.on(
    "game_winner",
    winner => {

        if (!winner) return;

        showTreasureWinner(
            winner
        );

    }
);


/* =====================================================
   TREASURE WINNER DISPLAY
===================================================== */

function showTreasureWinner(
    winner
) {

    clearIntroductionTimers();

    playSound(
        "win"
    );


    /*
       تأكد من إعادة حجم صورة الفائز
       إلى الوضع الطبيعي
    */

    resetWinnerAvatarStyle();


    winnerIcon.textContent =
        "🏆";

    winnerSubtitle.textContent =
        "الفائز";

    winnerName.textContent =
        winner.nickname ||
        "الفائز";

    winnerMessage.textContent =
        "وصل إلى الكنز أولاً";


    setWinnerAvatar(
        winner.profilePictureUrl
    );


    survivorsContainer.classList.add(
        "hidden"
    );


    winnerOverlay.classList.remove(
        "hidden"
    );

}


/* =====================================================
   GAME RESULT
===================================================== */

socket.on(
    "game_result",
    result => {

        if (!result) return;

        clearIntroductionTimers();


        /* =====================================
           NAHROUSH
        ====================================== */

        if (
            currentState?.gameMode ===
            "nahroush"
        ) {

            /*
               ==================================
               نهروش + الوحش يفوزان
               ==================================
            */

            if (
                result.winner ===
                "nahroush"
                ||
                result.winner ===
                "monsters"
            ) {

                playSound(
                    "nahroushWin"
                );


                winnerIcon.textContent =
                    "👑";

                winnerSubtitle.textContent =
                    "انتهت اللعبة";

                winnerName.textContent =
                    "نهروش والوحش يفوزان";

                winnerMessage.textContent =
                    "تم إقصاء جميع اللاعبين";


                /*
                   الصورة الكبيرة الخاصة
                   بفوز نهروش
                */

                setNahroushEndImage(
                    "/nahroush-wins.png"
                );


                survivorsContainer.classList.add(
                    "hidden"
                );

            }


            /*
               ==================================
               اللاعبون يقبضون على نهروش
               ==================================
            */

            else {

                playSound(
                    "win"
                );


                winnerIcon.textContent =
                    "🏆";

                winnerSubtitle.textContent =
                    "انتهت اللعبة";

                winnerName.textContent =
                    "اللاعبون يفوزون";

                winnerMessage.textContent =
                    "تم القبض على نهروش";


                /*
                   الصورة الكبيرة الخاصة
                   بالقبض على نهروش
                */

                setNahroushEndImage(
                    "/nahroush-caught.png"
                );


                survivorsContainer.classList.add(
                    "hidden"
                );

            }


            winnerOverlay.classList.remove(
                "hidden"
            );

            return;

        }


        /* =====================================
           NORMAL CHASE
        ====================================== */

        /*
           إعادة الصورة للحجم الطبيعي
           للمودات العادية
        */

        resetWinnerAvatarStyle();


        if (
            result.winner ===
            "monsters"
        ) {

            playSound(
                "monsterWin"
            );


            winnerIcon.textContent =
                "👹";

            winnerSubtitle.textContent =
                "انتهت الجولة";

            winnerName.textContent =
                "الوحش يفوز";

            winnerMessage.textContent =
                "تم إقصاء جميع اللاعبين";


            setWinnerAvatar("");

            survivorsContainer.classList.add(
                "hidden"
            );

        }

        else {

            playSound(
                "win"
            );


            winnerIcon.textContent =
                "🏆";

            winnerSubtitle.textContent =
                "انتهت الجولة";

            winnerName.textContent =
                "اللاعبون يفوزون";

            winnerMessage.textContent =
                "انتهى الوقت وبقي لاعب واحد على الأقل";


            setWinnerAvatar("");


            showSurvivors(
                result.survivors ||
                currentState?.players?.filter(
                    player =>
                        player.alive !== false
                ) ||
                []
            );

        }


        winnerOverlay.classList.remove(
            "hidden"
        );

    }
);


/* =====================================================
   PLAYER ELIMINATION
===================================================== */

socket.on(
    "player_eliminated",
    data => {

        if (!data) return;

        showElimination(
            data
        );

    }
);


/* =====================================================
   SHOW ELIMINATION
===================================================== */

function showElimination(
    data
) {

    if (!eliminationOverlay) {
        return;
    }


    clearTimeout(
        eliminationTimer
    );


    const player =
        data.player ||
        data;


    const nickname =
        player.nickname ||
        data.nickname ||
        "اللاعب";


    const avatar =
        player.profilePictureUrl ||
        data.profilePictureUrl ||
        "";


    eliminationName.textContent =
        nickname;


    if (avatar) {

        eliminationAvatar.src =
            avatar;

        eliminationAvatar.style.display =
            "block";

    }

    else {

        eliminationAvatar.src =
            createAvatarFallback();

        eliminationAvatar.style.display =
            "block";

    }


    eliminationOverlay.classList.remove(
        "hidden"
    );


    playSound(
        "elimination"
    );


    eliminationTimer =
        setTimeout(
            () => {

                eliminationOverlay.classList.add(
                    "hidden"
                );

            },
            ELIMINATION_DURATION
        );

}


/* =====================================================
   SURVIVORS
===================================================== */

function showSurvivors(
    players
) {

    if (
        !survivorsContainer ||
        !survivorsList
    ) {
        return;
    }


    const survivors =
        Array.isArray(players)
            ? players.filter(
                player =>
                    player &&
                    player.alive !== false
            )
            : [];


    if (!survivors.length) {

        survivorsContainer.classList.add(
            "hidden"
        );

        return;

    }


    survivorsList.innerHTML =
        "";


    survivors.forEach(
        player => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "survivor-item";


            const image =
                document.createElement(
                    "img"
                );


            if (
                player.profilePictureUrl
            ) {

                image.src =
                    player.profilePictureUrl;

            }

            else {

                image.src =
                    createAvatarFallback();

            }


            image.alt =
                player.nickname ||
                "ناجٍ";


            const name =
                document.createElement(
                    "span"
                );

            name.textContent =
                player.nickname ||
                "ناجٍ";


            item.appendChild(
                image
            );

            item.appendChild(
                name
            );

            survivorsList.appendChild(
                item
            );

        }
    );


    survivorsContainer.classList.remove(
        "hidden"
    );

}


/* =====================================================
   WINNER AVATAR
===================================================== */

function setWinnerAvatar(url) {

    /*
       هذه الدالة تستخدم للفائزين العاديين
       وتبقي الصورة بالحجم الطبيعي.
    */

    resetWinnerAvatarStyle();


    if (url) {

        winnerAvatar.src =
            url;

        winnerAvatar.style.display =
            "block";


        winnerAvatar.onerror =
            () => {

                showAvatarFallback();

            };

    }

    else {

        showAvatarFallback();

    }

}


/* =====================================================
   NAHROUSH END IMAGE
   صورة كبيرة وفخمة في نهاية مود نهروش
===================================================== */

function setNahroushEndImage(url) {

    if (!winnerAvatar) return;


    /*
       إلغاء أي معالج خطأ سابق
    */

    winnerAvatar.onerror = null;


    /*
       الصورة
    */

    winnerAvatar.src =
        url;


    winnerAvatar.style.display =
        "block";


    /*
       حجم كبير جدًا ومتجاوب
       مع شاشة الهاتف
    */

    winnerAvatar.style.setProperty(
        "width",
        "min(82vw, 330px)",
        "important"
    );

    winnerAvatar.style.setProperty(
        "height",
        "min(48vh, 370px)",
        "important"
    );

    winnerAvatar.style.setProperty(
        "max-width",
        "82vw",
        "important"
    );

    winnerAvatar.style.setProperty(
        "max-height",
        "48vh",
        "important"
    );


    /*
       الصورة كاملة بدون قص
    */

    winnerAvatar.style.setProperty(
        "object-fit",
        "contain",
        "important"
    );


    /*
       شكل فاخر
    */

    winnerAvatar.style.setProperty(
        "border-radius",
        "24px",
        "important"
    );

    winnerAvatar.style.setProperty(
        "border",
        "3px solid rgba(255, 215, 80, 0.95)",
        "important"
    );

    winnerAvatar.style.setProperty(
        "padding",
        "6px",
        "important"
    );

    winnerAvatar.style.setProperty(
        "background",
        "rgba(0, 0, 0, 0.25)",
        "important"
    );


    /*
       توهج ذهبي قوي
    */

    winnerAvatar.style.setProperty(
        "box-shadow",
        "0 0 12px rgba(255, 215, 80, 0.9), 0 0 30px rgba(255, 190, 0, 0.65), 0 0 65px rgba(255, 150, 0, 0.35)",
        "important"
    );


    /*
       منع الصورة من التشوه
    */

    winnerAvatar.style.setProperty(
        "display",
        "block",
        "important"
    );


    /*
       في حال فشل تحميل الصورة
       لا نعرض صورة المستخدم البديلة.
    */

    winnerAvatar.onerror =
        () => {

            console.warn(
                "تعذر تحميل صورة نهروش:",
                url
            );

            winnerAvatar.style.display =
                "none";

        };

}


/* =====================================================
   RESET WINNER AVATAR STYLE
===================================================== */

function resetWinnerAvatarStyle() {

    if (!winnerAvatar) return;


    /*
       إزالة جميع التعديلات الخاصة
       بصورة نهروش الكبيرة
    */

    winnerAvatar.style.removeProperty(
        "width"
    );

    winnerAvatar.style.removeProperty(
        "height"
    );

    winnerAvatar.style.removeProperty(
        "max-width"
    );

    winnerAvatar.style.removeProperty(
        "max-height"
    );

    winnerAvatar.style.removeProperty(
        "object-fit"
    );

   
