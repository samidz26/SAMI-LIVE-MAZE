const socket = io();

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


/* =====================================================
   CONSTANTS
===================================================== */

const MAZE_SIZE = 12;

/*
   32px لكل خلية.
   الـ SVG سيقوم بتصغيرها تلقائياً على الشاشات الصغيرة.
*/
const CELL_SIZE = 32;


/* =====================================================
   STATE
===================================================== */

let currentState = null;


/* =====================================================
   SVG HELPERS
===================================================== */

const SVG_NS =
    "http://www.w3.org/2000/svg";


function createSvgElement(
    type
) {

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

        currentState =
            state;

        renderMaze(
            state
        );

        updateTimer(
            state
        );

    }
);


/* =====================================================
   GAME STARTED
===================================================== */

socket.on(
    "game_started",
    state => {

        if (!state) return;

        winnerOverlay.classList.add(
            "hidden"
        );

        currentState =
            state;

        renderMaze(
            state
        );

        updateTimer(
            state
        );

    }
);


/* =====================================================
   RENDER MAZE
===================================================== */

function renderMaze(state) {

    mazeSvg.innerHTML =
        "";

    const maze =
        state.maze || [];

    const players =
        state.players || [];

    const treasure =
        state.treasure;

    const monsters =
        state.monsters || [];


    const size =
        MAZE_SIZE *
        CELL_SIZE;


    mazeSvg.setAttribute(
        "viewBox",
        `0 0 ${size} ${size}`
    );


    /* =====================================
       BACKGROUND
    ====================================== */

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
                col *
                CELL_SIZE;

            const y =
                row *
                CELL_SIZE;


            if (
                cell.walls?.top
            ) {

                drawWall(
                    x,
                    y,
                    x + CELL_SIZE,
                    y
                );

            }


            if (
                cell.walls?.right
            ) {

                drawWall(
                    x + CELL_SIZE,
                    y,
                    x + CELL_SIZE,
                    y + CELL_SIZE
                );

            }


            if (
                cell.walls?.bottom
            ) {

                drawWall(
                    x,
                    y + CELL_SIZE,
                    x + CELL_SIZE,
                    y + CELL_SIZE
                );

            }


            if (
                cell.walls?.left
            ) {

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
       TREASURE CHEST
    ====================================== */

    if (
        treasure
    ) {

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


/* =====================================================
   TREASURE CHEST
===================================================== */

function drawTreasure(
    col,
    row
) {

    const x =
        col *
        CELL_SIZE +
        CELL_SIZE / 2;


    const y =
        row *
        CELL_SIZE +
        CELL_SIZE / 2;


    const group =
        createSvgElement(
            "g"
        );


    group.setAttribute(
        "class",
        "treasure"
    );


    /*
       هالة حول الصندوق
    */

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


    /*
       ظل الصندوق
    */

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


    /*
       جسم الصندوق
    */

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


    /*
       غطاء الصندوق
    */

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


    /*
       الشريط الذهبي
    */

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


    /*
       القفل
    */

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


    /*
       لمعان
    */

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


/* =====================================================
   MONSTER
===================================================== */

function drawMonster(
    monster
) {

    if (
        monster.x === undefined ||
        monster.y === undefined
    ) {

        return;

    }


    const x =
        monster.x *
        CELL_SIZE +
        CELL_SIZE / 2;


    const y =
        monster.y *
        CELL_SIZE +
        CELL_SIZE / 2;


    const group =
        createSvgElement(
            "g"
        );


    group.setAttribute(
        "class",
        "maze-monster"
    );


    /*
       هالة الوحش
    */

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


    /*
       صورة الوحش
    */

    const image =
        createSvgElement(
            "image"
        );


    /*
       أصبح أكبر ليتناسب مع 12×12
    */

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


    image.onerror =
        () => {

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
        player.x *
        CELL_SIZE +
        CELL_SIZE / 2;


    const y =
        player.y *
        CELL_SIZE +
        CELL_SIZE / 2;


    const group =
        createSvgElement(
            "g"
        );


    group.setAttribute(
        "class",
        "maze-player"
    );


    /*
       هالة اللاعب
    */

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


    /*
       الإطار الخارجي
    */

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


    /*
       صورة اللاعب
       تقريباً 75% من حجم الخلية
    */

    const avatarSize =
        22;


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
            `playerClip_${index}_${Date.now()}`;


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


        image.onerror =
            () => {

                image.remove();

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


/* =====================================================
   TIMER
===================================================== */

function updateTimer(
    state
) {

    if (
        !state.gameStarted
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

        /*
           صندوق كنز بدل الجوهرة
        */

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

    else {

        gameTimer.classList.add(
            "timer-hidden"
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


        winnerOverlay.classList.remove(
            "hidden"
        );

    }
);


/* =====================================================
   CHASE RESULT
===================================================== */

socket.on(
    "game_result",
    result => {

        if (!result) return;


        if (
            result.winner === "monsters"
        ) {

            winnerIcon.textContent =
                "👹";


            winnerSubtitle.textContent =
                "انتهت الجولة";


            winnerName.textContent =
                "الوحوش تفوز";


            winnerMessage.textContent =
                "تم الإمساك بجميع اللاعبين";


            setWinnerAvatar(
                ""
            );

        }

        else {

            winnerIcon.textContent =
                "🏆";


            winnerSubtitle.textContent =
                "انتهت الجولة";


            winnerName.textContent =
                "اللاعبون يفوزون";


            winnerMessage.textContent =
                "انتهى الوقت وبقي لاعب واحد على الأقل";


            setWinnerAvatar(
                ""
            );

        }


        winnerOverlay.classList.remove(
            "hidden"
        );

    }
);


/* =====================================================
   WINNER AVATAR
===================================================== */

function setWinnerAvatar(
    url
) {

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

    winnerAvatar.src =
        "data:image/svg+xml," +
        encodeURIComponent(`

            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="200"
                height="200"
                viewBox="0 0 200 200">

                <rect
                    width="200"
                    height="200"
                    rx="100"
                    fill="#222"/>

                <text
                    x="100"
                    y="125"
                    text-anchor="middle"
                    font-size="90">

                    👤

                </text>

            </svg>

        `);

}


/* =====================================================
   RESET
===================================================== */

resetButton.addEventListener(
    "click",
    () => {

        resetButton.disabled =
            true;


        socket.emit(
            "reset_game"
        );


        window.location.href =
            "/registration.html";

    }
);
