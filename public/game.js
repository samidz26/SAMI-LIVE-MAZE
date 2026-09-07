"use strict";

/* =========================================================
   SAMI LIVE MAZE
   GAME.JS - REBUILT
   ========================================================= */

const socket = io();

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const mazeSvg = document.getElementById("maze");

const gameTimer = document.getElementById("gameTimer");
const timerIcon = document.getElementById("timerIcon");
const timerValue = document.getElementById("timerValue");

const winnerOverlay = document.getElementById("winnerOverlay");
const winnerIcon = document.getElementById("winnerIcon");
const winnerSubtitle = document.getElementById("winnerSubtitle");
const winnerAvatar = document.getElementById("winnerAvatar");
const winnerName = document.getElementById("winnerName");
const winnerMessage = document.getElementById("winnerMessage");

const resetButton = document.getElementById("resetButton");

const gameModeLabel = document.getElementById("gameModeLabel");

const gameInstructions = document.getElementById("gameInstructions");
const instructionTitle = document.getElementById("instructionTitle");
const instructionText = document.getElementById("instructionText");

const gameCountdown = document.getElementById("gameCountdown");
const countdownValue = document.getElementById("countdownValue");

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


/* =========================================================
   CONSTANTS
   ========================================================= */

const MAZE_SIZE = 12;
const CELL_SIZE = 32;

const INTRO_DURATION = 5000;
const ELIMINATION_DURATION = 1500;


/* =========================================================
   STATE
   ========================================================= */

let currentState = null;

/*
   نتيجة وصلت من السيرفر قبل game_state النهائي.
   نحفظها حتى تصل الحالة النهائية ثم نعرضها.
*/
let pendingGameResult = null;

let roundFinished = false;

let instructionTimer = null;
let countdownTimer = null;
let eliminationTimer = null;

let audioContext = null;


/* =========================================================
   SVG
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";


function createSvgElement(type) {
    return document.createElementNS(SVG_NS, type);
}


/* =========================================================
   SAFE HELPERS
   ========================================================= */

function safeClassAdd(element, className) {
    if (element) {
        element.classList.add(className);
    }
}


function safeClassRemove(element, className) {
    if (element) {
        element.classList.remove(className);
    }
}


function setText(element, value) {
    if (element) {
        element.textContent = value ?? "";
    }
}


function createAvatarFallback() {
    return "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="100"
                 height="100"
                 viewBox="0 0 100 100">
                <rect width="100" height="100" rx="50"
                      fill="#222"/>
                <text x="50" y="62"
                      text-anchor="middle"
                      font-size="50">👤</text>
            </svg>
        `);
}


/* =========================================================
   INTRODUCTION
   ========================================================= */

function clearIntroductionTimers() {

    if (instructionTimer) {
        clearTimeout(instructionTimer);
        instructionTimer = null;
    }

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    safeClassAdd(gameInstructions, "hidden");
    safeClassAdd(gameCountdown, "hidden");
}


function startGameIntroduction(state) {

    clearIntroductionTimers();

    if (!gameInstructions) {
        return;
    }

    /*
       لا نعرض مقدمة إذا كانت الجولة انتهت.
    */
    if (!state || !state.gameStarted) {
        return;
    }

    safeClassRemove(gameInstructions, "hidden");

    if (state.gameMode === "treasure") {

        setText(
            instructionTitle,
            "الهدف الوصول إلى الكنز"
        );

        setText(
            instructionText,
            "كن أول من يصل إلى الكنز"
        );

    }

    else if (state.gameMode === "chase") {

        setText(
            instructionTitle,
            "الهدف النجاة من الوحش"
        );

        setText(
            instructionText,
            "اهرب من الوحش وحاول البقاء حتى نهاية الوقت"
        );

    }

    else if (state.gameMode === "nahroush") {

        setText(
            instructionTitle,
            "الهدف القضاء على البومة"
        );

        setText(
            instructionText,
            "اعثر على نهروش واحذر من الوحش"
        );

    }

    else {

        setText(
            instructionTitle,
            "استعدوا للعب"
        );

        setText(
            instructionText,
            "تحركوا باستخدام الأوامر"
        );
    }

    playSound("instruction");

    startCountdown();

    instructionTimer = setTimeout(() => {

        safeClassAdd(
            gameInstructions,
            "hidden"
        );

    }, INTRO_DURATION);
}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function startCountdown() {

    if (!gameCountdown || !countdownValue) {
        return;
    }

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    let value = 5;

    safeClassRemove(
        gameCountdown,
        "hidden"
    );

    countdownValue.textContent = value;

    playSound("countdown");

    countdownTimer = setInterval(() => {

        value--;

        if (value > 0) {

            countdownValue.textContent = value;

            playSound("countdown");

            return;
        }

        if (value === 0) {

            countdownValue.textContent = "GO!";

            playSound("start");

            return;
        }

        clearInterval(countdownTimer);

        countdownTimer = null;

        safeClassAdd(
            gameCountdown,
            "hidden"
        );

    }, 1000);
}


/* =========================================================
   GAME MODE
   ========================================================= */

function updateModeLabel(state) {

    if (!gameModeLabel) {
        return;
    }

    if (state?.gameMode === "treasure") {

        gameModeLabel.textContent =
            "🏆 مود الكنز";

    }

    else if (state?.gameMode === "chase") {

        gameModeLabel.textContent =
            "👹 مود النجاة";

    }

    else if (state?.gameMode === "nahroush") {

        gameModeLabel.textContent =
            "🦉 مود القبض على نهروش";

    }

    else {

        gameModeLabel.textContent =
            "لعبة المتاهة";
    }
}


/* =========================================================
   GAME STATE
   ========================================================= */

socket.on("game_state", state => {

    if (!state) {
        return;
    }

    currentState = state;

    updateModeLabel(state);

    /*
       أثناء اللعب فقط نرسم المتاهة بشكل طبيعي.
    */
    renderMaze(state);

    updateTimer(state);

    /*
       إذا كانت الجولة انتهت وهناك نتيجة:
       نعرضها الآن.
       
       هذا مهم لأن السيرفر يرسل:
       game_result
       ثم
       game_state
    */
    if (
        state.gameStarted === false &&
        state.gameResult
    ) {

        roundFinished = true;

        pendingGameResult =
            state.gameResult;

        showGameResult(
            state.gameResult,
            state
        );

        return;
    }

    /*
       إذا بدأت جولة جديدة.
    */
    if (state.gameStarted === true) {

        roundFinished = false;

        pendingGameResult = null;

        /*
           لا نسمح ببقاء شاشة النتيجة.
        */
        hideWinnerOverlay();

        /*
           لا نسمح ببقاء رسالة إقصاء قديمة.
        */
        hideElimination();

    }
});


/* =========================================================
   GAME RESULT EVENT
   ========================================================= */

socket.on("game_result", result => {

    if (!result) {
        return;
    }

    /*
       لا نحاول عرض النتيجة بشكل نهائي قبل وصول
       game_state النهائي، لأن currentState قد يكون
       ما زال يمثل الجولة السابقة.
    */
    pendingGameResult = result;

    clearIntroductionTimers();

    /*
       إذا كانت لدينا حالة نهائية بالفعل، اعرض مباشرة.
    */
    if (
        currentState &&
        currentState.gameStarted === false
    ) {

        roundFinished = true;

        showGameResult(
            result,
            currentState
        );
    }
});


/* =========================================================
   GAME STARTED EVENT
   ========================================================= */

socket.on("game_started", state => {

    if (!state) {
        return;
    }

    currentState = state;

    roundFinished = false;

    pendingGameResult = null;

    hideWinnerOverlay();

    hideElimination();

    resetWinnerAvatarStyle();

    updateModeLabel(state);

    renderMaze(state);

    updateTimer(state);

    startGameIntroduction(state);
});


/* =========================================================
   RENDER MAZE
   ========================================================= */

function renderMaze(state) {

    if (!mazeSvg) {
        return;
    }

    /*
       لا نسمح للمتاهة أن تتدخل في شاشة النتيجة.
       لكننا نواصل رسم آخر حالة حتى تبقى الخلفية.
    */

    mazeSvg.innerHTML = "";

    const maze = state?.maze || [];
    const players = state?.players || [];
    const treasure = state?.treasure;
    const monsters = state?.monsters || [];

    const size =
        MAZE_SIZE * CELL_SIZE;

    mazeSvg.setAttribute(
        "viewBox",
        `0 0 ${size} ${size}`
    );

    /* =====================================================
       BACKGROUND
       ===================================================== */

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


    /* =====================================================
       WALLS
       ===================================================== */

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

            if (!cell) {
                continue;
            }

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


    /* =====================================================
       TREASURE
       ===================================================== */

    if (treasure) {

        drawTreasure(
            treasure.x,
            treasure.y
        );
    }


    /* =====================================================
       MONSTERS
       ===================================================== */

    monsters.forEach(monster => {

        drawMonster(monster);

    });


    /* =====================================================
       PLAYERS
       ===================================================== */

    players.forEach((player, index) => {

        /*
           اللاعب المقصى لا يظهر داخل المتاهة.
        */
        if (
            player.alive === false
        ) {
            return;
        }

        drawPlayer(
            player,
            index
        );

    });
}


/* =========================================================
   DRAW WALL
   ========================================================= */

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


/* =========================================================
   DRAW TREASURE
   ========================================================= */

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

    group.appendChild(glow);


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

    group.appendChild(shadow);


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

    group.appendChild(body);


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

    group.appendChild(lid);


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

    group.appendChild(band);


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

    group.appendChild(lock);


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

    group.appendChild(shine);


    mazeSvg.appendChild(group);
}


/* =========================================================
   DRAW MONSTER
   ========================================================= */

function drawMonster(monster) {

    if (
        monster?.x === undefined ||
        monster?.y === undefined
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

    group.appendChild(glow);


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

        fallback.textContent = "👹";

        group.appendChild(fallback);
    };

    group.appendChild(image);

    mazeSvg.appendChild(group);
}


/* =========================================================
   DRAW PLAYER
   ========================================================= */

function drawPlayer(
    player,
    index
) {

    if (
        player?.x === undefined ||
        player?.y === undefined
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


    /* =====================================================
       GLOW
       ===================================================== */

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
        player.isNahroush ? 17 : 14
    );

    glow.setAttribute(
        "class",
        player.isNahroush
            ? "player-glow nahroush-glow"
            : "player-glow"
    );

    group.appendChild(glow);


    /* =====================================================
       OUTER RING
       ===================================================== */

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
        player.isNahroush ? 14 : 13
    );

    circle.setAttribute(
        "class",
        player.isNahroush
            ? "player-ring nahroush-ring"
            : "player-ring"
    );

    group.appendChild(circle);


    /* =====================================================
       AVATAR
       ===================================================== */

    const avatarSize =
        player.isNahroush ? 24 : 22;

    if (player.profilePictureUrl) {

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
            `playerClip_${index}_${Math.random()
                .toString(36)
                .slice(2)}`;

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
            player.isNahroush ? 12 : 11
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
                "player-fallback"
            );

            fallback.textContent =
                player.isNahroush
                    ? "👑"
                    : "👤";

            group.appendChild(
                fallback
            );
        };

        group.appendChild(image);

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

        group.appendChild(text);
    }


    /* =====================================================
       NAHROUSH CROWN
       ===================================================== */

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

        crown.textContent = "👑";

        group.appendChild(crown);
    }


    mazeSvg.appendChild(group);
}


/* =========================================================
   TIMER
   ========================================================= */

function updateTimer(state) {

    if (!gameTimer) {
        return;
    }

    /*
       عند انتهاء الجولة نخفي المؤقت.
    */
    if (
        !state ||
        !state.gameStarted ||
        state.gameMode === "nahroush"
    ) {

        safeClassAdd(
            gameTimer,
            "timer-hidden"
        );

        return;
    }

    safeClassRemove(
        gameTimer,
        "timer-hidden"
    );

    if (state.gameMode === "treasure") {

        setText(
            timerIcon,
            "🧰"
        );

        setText(
            timerValue,
            Math.max(
                0,
                Number(
                    state.treasureTimeLeft || 0
                )
            )
        );
    }

    else if (state.gameMode === "chase") {

        setText(
            timerIcon,
            "⏱️"
        );

        setText(
            timerValue,
            Math.max(
                0,
                Number(
                    state.roundTimeLeft || 0
                )
            )
        );
    }
}


/* =========================================================
   TREASURE WINNER
   ========================================================= */

socket.on("game_winner", winner => {

    if (!winner) {
        return;
    }

    roundFinished = true;

    clearIntroductionTimers();

    hideElimination();

    showTreasureWinner(winner);
});


function showTreasureWinner(winner) {

    if (!winnerOverlay) {
        return;
    }

    resetWinnerAvatarStyle();

    playSound("win");

    setText(
        winnerIcon,
        "🏆"
    );

    setText(
        winnerSubtitle,
        "انتهت الجولة"
    );

    setText(
        winnerName,
        winner.nickname || "الفائز"
    );

    setText(
        winnerMessage,
        "وصل إلى الكنز أولاً"
    );

    setWinnerAvatar(
        winner.profilePictureUrl
    );

    safeClassAdd(
        survivorsContainer,
        "hidden"
    );

    safeClassRemove(
        winnerOverlay,
        "hidden"
    );
}


/* =========================================================
   GAME RESULT
   ========================================================= */

function showGameResult(
    result,
    state
) {

    if (!winnerOverlay || !result) {
        return;
    }

    roundFinished = true;

    clearIntroductionTimers();

    /*
       النتيجة لها الأولوية.
       لذلك نغلق إشعار الإقصاء فورًا.
    */
    hideElimination();

    /*
       إخفاء المؤقت.
    */
    if (gameTimer) {
        gameTimer.classList.add(
            "timer-hidden"
        );
    }

    resetWinnerAvatarStyle();

    /*
       مود النجاة
    */
    if (
        state?.gameMode === "chase" ||
        result.winner === "monsters" ||
        result.winner === "players"
    ) {

        showChaseResult(
            result,
            state
        );

        return;
    }


    /*
       مود نهروش
    */
    if (
        state?.gameMode === "nahroush" ||
        result.winner === "nahroush"
    ) {

        showNahroushResult(
            result
        );

        return;
    }
}


/* =========================================================
   CHASE RESULT
   ========================================================= */

function showChaseResult(
    result,
    state
) {

    if (!winnerOverlay) {
        return;
    }

    resetWinnerAvatarStyle();

    /*
       الوحوش فازت.
    */
    if (
        result.winner === "monsters"
    ) {

        playSound("monsterWin");

        setText(
            winnerIcon,
            "👹"
        );

        setText(
            winnerSubtitle,
            "انتهت الجولة"
        );

        setText(
            winnerName,
            "الوحش يفوز"
        );

        setText(
            winnerMessage,
            result.message ||
            "تم إقصاء جميع اللاعبين"
        );

        setWinnerAvatar("");

        safeClassAdd(
            survivorsContainer,
            "hidden"
        );
    }

    /*
       اللاعبون فازوا.
    */
    else {

        playSound("win");

        setText(
            winnerIcon,
            "🏆"
        );

        setText(
            winnerSubtitle,
            "انتهت الجولة"
        );

        setText(
            winnerName,
            "اللاعبون يفوزون"
        );

        setText(
            winnerMessage,
            result.message ||
            "انتهى الوقت وبقي لاعب واحد على الأقل"
        );

        setWinnerAvatar("");

        /*
           إذا أرسل السيرفر survivors مستقبلًا
           نستخدمها مباشرة.
           وإذا لم يرسلها، نأخذها من الحالة النهائية.
        */
        let survivors =
            Array.isArray(result.survivors)
                ? result.survivors
                : [];

        if (!survivors.length) {

            survivors =
                Array.isArray(state?.players)
                    ? state.players.filter(
                        player =>
                            player &&
                            player.alive !== false &&
                            !player.isNahroush
                    )
                    : [];
        }

        showSurvivors(
            survivors
        );
    }

    /*
       إظهار النتيجة فوق المتاهة.
    */
    safeClassRemove(
        winnerOverlay,
        "hidden"
    );
}


/* =========================================================
   NAHROUSH RESULT
   ========================================================= */

socket.on("game_result", result => {

    /*
       المعالجة الرئيسية موجودة في الأعلى.
       هذا الجزء لا يحتوي على مستمع ثانٍ.
       هذه الدالة هنا فقط للتأكد من أن
       نتيجة نهروش تستخدم الصور الخاصة.
    */

    if (!result) {
        return;
    }

    /*
       إذا كانت الحالة الحالية نهروش بالفعل
       وكانت الجولة منتهية، اعرضها.
    */
    if (
        currentState?.gameMode === "nahroush" &&
        currentState.gameStarted === false
    ) {

        showNahroushResult(
            result
        );
    }
});


function showNahroushResult(result) {

    if (!winnerOverlay) {
        return;
    }

    clearIntroductionTimers();

    hideElimination();

    if (
        result.winner === "nahroush" ||
        result.winner === "monsters"
    ) {

        playSound(
            "nahroushWin"
        );

        setText(
            winnerIcon,
            "👑"
        );

        setText(
            winnerSubtitle,
            "انتهت اللعبة"
        );

        setText(
            winnerName,
            "نهروش والوحش يفوزان"
        );

        setText(
            winnerMessage,
            result.message ||
            "تم إقصاء جميع اللاعبين"
        );

        setNahroushEndImage(
            "/nahroush-wins.png"
        );

        safeClassAdd(
            survivorsContainer,
            "hidden"
        );
    }

    else {

        playSound(
            "win"
        );

        setText(
            winnerIcon,
            "🏆"
        );

        setText(
            winnerSubtitle,
            "انتهت اللعبة"
        );

        setText(
            winnerName,
            "اللاعبون يفوزون"
        );

        setText(
            winnerMessage,
            result.message ||
            "تم القبض على نهروش"
        );

        setNahroushEndImage(
            "/nahroush-caught.png"
        );

        safeClassAdd(
            survivorsContainer,
            "hidden"
        );
    }

    safeClassRemove(
        winnerOverlay,
        "hidden"
    );
}


/* =========================================================
   PLAYER ELIMINATION
   ========================================================= */

socket.on(
    "player_eliminated",
    data => {

        if (!data) {
            return;
        }

        /*
           إذا كانت الجولة انتهت، لا نعيد إظهار
           رسالة الإقصاء فوق نتيجة الجولة.
        */
        if (roundFinished) {
            return;
        }

        showElimination(data);
    }
);


/* =========================================================
   SHOW ELIMINATION
   ========================================================= */

function showElimination(data) {

    if (!eliminationOverlay) {
        return;
    }

    /*
       إلغاء المؤقت السابق.
       هذا مهم جدًا:
       كل إقصاء جديد يبدأ 1.5 ثانية جديدة.
    */
    if (eliminationTimer) {

        clearTimeout(
            eliminationTimer
        );

        eliminationTimer = null;
    }

    const player =
        data.player || data;

    const nickname =
        player.nickname ||
        data.nickname ||
        "اللاعب";

    const avatar =
        player.profilePictureUrl ||
        data.profilePictureUrl ||
        "";

    setText(
        eliminationName,
        nickname
    );

    if (eliminationAvatar) {

        eliminationAvatar.onerror = () => {

            eliminationAvatar.src =
                createAvatarFallback();

            eliminationAvatar.style.display =
                "block";
        };

        eliminationAvatar.src =
            avatar ||
            createAvatarFallback();

        eliminationAvatar.style.display =
            "block";
    }

    /*
       إظهار الرسالة.
    */
    safeClassRemove(
        eliminationOverlay,
        "hidden"
    );

    playSound(
        "elimination"
    );

    /*
       إخفاؤها بعد 1.5 ثانية بالضبط.
    */
    eliminationTimer =
        setTimeout(() => {

            safeClassAdd(
                eliminationOverlay,
                "hidden"
            );

            eliminationTimer = null;

        }, ELIMINATION_DURATION);
}


/* =========================================================
   HIDE ELIMINATION
   ========================================================= */

function hideElimination() {

    if (eliminationTimer) {

        clearTimeout(
            eliminationTimer
        );

        eliminationTimer = null;
    }

    safeClassAdd(
        eliminationOverlay,
        "hidden"
    );
}


/* =========================================================
   SURVIVORS
   ========================================================= */

function showSurvivors(players) {

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
                    player.alive !== false &&
                    !player.isNahroush
            )
            : [];

    survivorsList.innerHTML = "";

    if (!survivors.length) {

        safeClassAdd(
            survivorsContainer,
            "hidden"
        );

        return;
    }

    survivors.forEach(player => {

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

        image.src =
            player.profilePictureUrl ||
            createAvatarFallback();

        image.alt =
            player.nickname ||
            "ناجٍ";

        image.onerror = () => {

            image.src =
                createAvatarFallback();
        };


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
    });

    safeClassRemove(
        survivorsContainer,
        "hidden"
    );
}


/* =========================================================
   WINNER AVATAR
   ========================================================= */

function setWinnerAvatar(url) {

    if (!winnerAvatar) {
        return;
    }

    resetWinnerAvatarStyle();

    winnerAvatar.onerror = null;

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


function showAvatarFallback() {

    if (!winnerAvatar) {
        return;
    }

    winnerAvatar.src =
        createAvatarFallback();

    winnerAvatar.style.display =
        "block";
}


/* =========================================================
   NAHROUSH END IMAGE
   ========================================================= */

function setNahroushEndImage(url) {

    if (!winnerAvatar) {
        return;
    }

    winnerAvatar.onerror = null;

    winnerAvatar.src =
        url;

    winnerAvatar.style.display =
        "block";

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

    winnerAvatar.style.setProperty(
        "object-fit",
        "contain",
        "important"
    );

    winnerAvatar.style.setProperty(
        "border-radius",
        "24px",
        "important"
    );

    winnerAvatar.style.setProperty(
        "border",
        "3px solid rgba(255,215,80,.95)",
        "important"
    );

    winnerAvatar.style.setProperty(
        "padding",
        "6px",
        "important"
    );

    winnerAvatar.style.setProperty(
        "background",
        "rgba(0,0,0,.25)",
        "important"
    );

    winnerAvatar.style.setProperty(
        "box-shadow",
        "0 0 12px rgba(255,215,80,.9), 0 0 30px rgba(255,190,0,.65), 0 0 65px rgba(255,150,0,.35)",
        "important"
    );

    winnerAvatar.onerror = () => {

        winnerAvatar.style.display =
            "none";
    };
}


/* =========================================================
   RESET WINNER AVATAR STYLE
   ========================================================= */

function resetWinnerAvatarStyle() {

    if (!winnerAvatar) {
        return;
    }

    [
        "width",
        "height",
        "max-width",
        "max-height",
        "object-fit",
        "border-radius",
        "border",
        "padding",
        "background",
        "box-shadow"
    ].forEach(property => {

        winnerAvatar.style.removeProperty(
            property
        );

    });

    winnerAvatar.onerror = null;
}


/* =========================================================
   HIDE WINNER
   ========================================================= */

function hideWinnerOverlay() {

    safeClassAdd(
        winnerOverlay,
        "hidden"
    );

    safeClassAdd(
        survivorsContainer,
        "hidden"
    );

    resetWinnerAvatarStyle();
}


/* =========================================================
   RESET BUTTON
   ========================================================= */

if (resetButton) {

    resetButton.addEventListener(
        "click",
        () => {

            roundFinished = false;

            pendingGameResult = null;

            hideWinnerOverlay();

            hideElimination();

            clearIntroductionTimers();

            socket.emit(
                "reset_game"
            );
        }
    );
}


/* =========================================================
   AUDIO
   ========================================================= */

function playSound(type) {

    /*
       الصوت ليس شرطًا لعمل اللعبة.
       لذلك أي خطأ في AudioContext لن يوقف اللعبة.
    */

    try {

        if (!audioContext) {

            const AudioContextClass =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContextClass) {
                return;
            }

            audioContext =
                new AudioContextClass();
        }

        if (
            audioContext.state ===
            "suspended"
        ) {

            audioContext.resume()
                .catch(() => {});
        }

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        let frequency = 440;
        let duration = 0.12;

        switch (type) {

            case "countdown":
                frequency = 520;
                duration = 0.08;
                break;

            case "start":
                frequency = 880;
                duration = 0.18;
                break;

            case "win":
                frequency = 740;
                duration = 0.25;
                break;

            case "monsterWin":
                frequency = 180;
                duration = 0.35;
                break;

            case "nahroushWin":
                frequency = 620;
                duration = 0.3;
                break;

            case "elimination":
                frequency = 220;
                duration = 0.16;
                break;

            case "instruction":
                frequency = 430;
                duration = 0.1;
                break;
        }

        oscillator.type = "sine";

        oscillator.frequency.value =
            frequency;

        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.08,
            audioContext.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime +
            duration +
            0.02
        );

    } catch (error) {

        /*
           الصوت اختياري.
           لا نسمح له بكسر اللعبة.
        */

        console.warn(
            "Audio unavailable:",
            error
        );
    }
}


/* =========================================================
   INITIAL UI
   ========================================================= */

hideWinnerOverlay();
hideElimination();

if (gameTimer) {

    gameTimer.classList.add(
        "timer-hidden"
    );
}


/* =========================================================
   END
   ========================================================= */

console.log(
    "SAMI LIVE MAZE - game.js loaded"
);
