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

            <rect
                width="100"
                height="100"
                rx="50"
                fill="#222"
            />

            <text
                x="50"
                y="62"
                text-anchor="middle"
                font-size="50"
            >👤</text>

        </svg>
    `);

}

/* =========================================================
INTRODUCTION
========================================================= */

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

safeClassAdd(
    gameInstructions,
    "hidden"
);

safeClassAdd(
    gameCountdown,
    "hidden"
);

}

function startGameIntroduction(state) {

clearIntroductionTimers();

if (!gameInstructions) {
    return;
}

if (
    !state ||
    !state.gameStarted
) {
    return;
}

safeClassRemove(
    gameInstructions,
    "hidden"
);


if (
    state.gameMode === "treasure"
) {

    setText(
        instructionTitle,
        "الهدف الوصول إلى الكنز"
    );

    setText(
        instructionText,
        "كن أول من يصل إلى الكنز"
    );

}

else if (
    state.gameMode === "chase"
) {

    setText(
        instructionTitle,
        "الهدف النجاة من الوحش"
    );

    setText(
        instructionText,
        "اهرب من الوحش وحاول البقاء حتى نهاية الوقت"
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

playSound(
    "instruction"
);

startCountdown();

instructionTimer =
    setTimeout(() => {

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

if (
    !gameCountdown ||
    !countdownValue
) {
    return;
}

if (countdownTimer) {

    clearInterval(
        countdownTimer
    );

    countdownTimer = null;
}

let value = 5;

safeClassRemove(
    gameCountdown,
    "hidden"
);

countdownValue.textContent =
    value;

playSound(
    "countdown"
);

countdownTimer =
    setInterval(() => {

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

if (
    state?.gameMode === "treasure"
) {

    gameModeLabel.textContent =
        "🏆 مود الكنز";

}

else if (
    state?.gameMode === "chase"
) {

    gameModeLabel.textContent =
        "👹 مود النجاة";

}

else {

    gameModeLabel.textContent =
        "لعبة المتاهة";
}

}

/* =========================================================
GAME STATE
========================================================= */

socket.on(
"game_state",
state => {

    if (!state) {
        return;
    }

    currentState = state;

    updateModeLabel(
        state
    );

    renderMaze(
        state
    );

    updateTimer(
        state
    );


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


    if (
        state.gameStarted === true
    ) {

        roundFinished = false;

        pendingGameResult = null;

        hideWinnerOverlay();

        hideElimination();
    }

}

);

/* =========================================================
GAME RESULT EVENT
========================================================= */

socket.on(
"game_result",
result => {

    if (!result) {
        return;
    }

    pendingGameResult =
        result;

    clearIntroductionTimers();


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

}

);

/* =========================================================
GAME STARTED EVENT
========================================================= */

socket.on(
"game_started",
state => {

    if (!state) {
        return;
    }

    currentState =
        state;

    roundFinished = false;

    pendingGameResult = null;

    hideWinnerOverlay();

    hideElimination();

    resetWinnerAvatarStyle();

    updateModeLabel(
        state
    );

    renderMaze(
        state
    );

    updateTimer(
        state
    );

    startGameIntroduction(
        state
    );

}

);

/* =========================================================
RENDER MAZE
========================================================= */

function renderMaze(state) {

if (!mazeSvg) {
    return;
}

mazeSvg.innerHTML = "";

const maze =
    state?.maze || [];

const players =
    state?.players || [];

const treasure =
    state?.treasure;

const monsters =
    state?.monsters || [];

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
    createSvgElement(
        "rect"
    );

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

monsters.forEach(
    monster => {

        drawMonster(
            monster
        );

    }
);


/* =====================================================
   PLAYERS
   ===================================================== */

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
    createSvgElement(
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
    createSvgElement(
        "g"
    );

group.setAttribute(
    "class",
    "treasure"
);


const glow =
    createSvgElement(
        "circle"
    );

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


const shadow =
    createSvgElement(
        "ellipse"
    );

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


const body =
    createSvgElement(
        "rect"
    );

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


const lid =
    createSvgElement(
        "path"
    );

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


const band =
    createSvgElement(
        "rect"
    );

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


const lock =
    createSvgElement(
        "rect"
    );

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


const shine =
    createSvgElement(
        "circle"
    );

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
    createSvgElement(
        "g"
    );

group.setAttribute(
    "class",
    "maze-monster"
);


const glow =
    createSvgElement(
        "circle"
    );

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


const image =
    createSvgElement(
        "image"
    );

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
        createSvgElement(
            "text"
        );

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
    createSvgElement(
        "g"
    );

group.setAttribute(
    "class",
    "maze-player"
);


/* =====================================================
   GLOW
   ===================================================== */

const glow =
    createSvgElement(
        "circle"
    );

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
    "player-glow"
);

group.appendChild(
    glow
);


/* =====================================================
   OUTER RING
   ===================================================== */

const circle =
    createSvgElement(
        "circle"
    );

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
    13
);

circle.setAttribute(
    "class",
    "player-ring"
);

group.appendChild(
    circle
);


/* =====================================================
   AVATAR
   ===================================================== */

const avatarSize = 22;

if (
    player.profilePictureUrl
) {

    const image =
        createSvgElement(
            "image"
        );

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
        createSvgElement(
            "defs"
        );

    const clipPath =
        createSvgElement(
            "clipPath"
        );

    clipPath.setAttribute(
        "id",
        clipId
    );

    const clipCircle =
        createSvgElement(
            "circle"
        );

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
        11
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
            createSvgElement(
                "text"
            );

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
            "👤";

        group.appendChild(
            fallback
        );
    };

    group.appendChild(
        image
    );

}

else {

    const text =
        createSvgElement(
            "text"
        );

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
        "👤";

    group.appendChild(
        text
    );
}


mazeSvg.appendChild(
    group
);

}

/* =========================================================
TIMER
========================================================= */

function updateTimer(state) {

if (!gameTimer) {
    return;
}

if (
    !state ||
    !state.gameStarted
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


if (
    state.gameMode === "treasure"
) {

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

else if (
    state.gameMode === "chase"
) {

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

socket.on(
"game_winner",
winner => {

    if (!winner) {
        return;
    }

    roundFinished = true;

    clearIntroductionTimers();

    hideElimination();

    showTreasureWinner(
        winner
    );

}

);

function showTreasureWinner(
winner
) {

if (!winnerOverlay) {
    return;
}

resetWinnerAvatarStyle();

playSound(
    "win"
);

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
    winner.nickname ||
    "الفائز"
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

if (
    !winnerOverlay ||
    !result
) {
    return;
}

roundFinished = true;

clearIntroductionTimers();

hideElimination();


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
   الوحوش فازت
*/

if (
    result.winner === "monsters"
) {

    playSound(
        "monsterWin"
    );

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

    setWinnerAvatar(
        ""
    );

    safeClassAdd(
        survivorsContainer,
        "hidden"
    );
}


/*
   اللاعبون فازوا
*/

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

    setWinnerAvatar(
        ""
    );


    let survivors =
        Array.isArray(
            result.survivors
        )
            ? result.survivors
            : [];


    if (
        !survivors.length
    ) {

        survivors =
            Array.isArray(
                state?.players
            )
                ? state.players.filter(
                    player =>
                        player &&
                        player.alive !== false
                )
                : [];
    }

    showSurvivors(
        survivors
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

    if (roundFinished) {
        return;
    }

    showElimination(
        data
    );
}

);

/* =========================================================
SHOW ELIMINATION
========================================================= */

function showElimination(data) {

if (!eliminationOverlay) {
    return;
}


if (eliminationTimer) {

    clearTimeout(
        eliminationTimer
    );

    eliminationTimer = null;
}


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


setText(
    eliminationName,
    nickname
);


if (eliminationAvatar) {

    eliminationAvatar.onerror =
        () => {

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


safeClassRemove(
    eliminationOverlay,
    "hidden"
);

playSound(
    "elimination"
);


eliminationTimer =
    setTimeout(
        () => {

            safeClassAdd(
                eliminationOverlay,
                "hidden"
            );

            eliminationTimer = null;

        },
        ELIMINATION_DURATION
    );

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
                player.alive !== false
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

        image.src =
            player.profilePictureUrl ||
            createAvatarFallback();

        image.alt =
            player.nickname ||
            "ناجٍ";


        image.onerror =
            () => {

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

    }
);


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
].forEach(
    property => {

        winnerAvatar.style.removeProperty(
            property
        );

    }
);

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

        setTimeout(
            () => {

                window.location.href =
                    "registration.html";

            },
            100
        );

    }
);

}

/* =========================================================
AUDIO
========================================================= */

function playSound(type) {

/*
   الصوت اختياري ولا يؤثر على اللعبة.
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
            .catch(
                () => {}
            );
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


        case "elimination":

            frequency = 220;
            duration = 0.16;

            break;


        case "instruction":

            frequency = 430;
            duration = 0.1;

            break;
    }


    oscillator.type =
        "sine";

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


    oscillator.connect(
        gain
    );

    gain.connect(
        audioContext.destination
    );


    oscillator.start();


    oscillator.stop(
        audioContext.currentTime +
        duration +
        0.02
    );

}

catch (error) {

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
