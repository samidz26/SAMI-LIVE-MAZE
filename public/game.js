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

const MAZE_SIZE = 15;

const CELL_SIZE = 20;


/* =====================================================
   STATE
===================================================== */

let currentState = null;


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
        document.createElementNS(
            "http://www.w3.org/2000/svg",
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
       TREASURE
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


    mazeSvg.appendChild(
        line
    );

}


/* =====================================================
   TREASURE
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
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );


    group.setAttribute(
        "class",
        "treasure"
    );


    const circle =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
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
        8
    );


    const text =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );


    text.setAttribute(
        "x",
        x
    );

    text.setAttribute(
        "y",
        y + 5
    );

    text.setAttribute(
        "text-anchor",
        "middle"
    );


    text.setAttribute(
        "class",
        "treasure-icon"
    );


    text.textContent =
        "💎";


    group.appendChild(
        circle
    );

    group.appendChild(
        text
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
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );


    group.setAttribute(
        "class",
        "maze-monster"
    );


    /*
        سيتم استخدام الصورة:
        /monster.png

        عندما تضعها داخل public/
    */

    const image =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "image"
        );


    image.setAttribute(
        "x",
        x - 9
    );

    image.setAttribute(
        "y",
        y - 9
    );

    image.setAttribute(
        "width",
        18
    );

    image.setAttribute(
        "height",
        18
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
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text"
                );

            fallback.setAttribute(
                "x",
                x
            );

            fallback.setAttribute(
                "y",
                y + 5
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
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );


    group.setAttribute(
        "class",
        "maze-player"
    );


    const circle =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
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
        8
    );


    group.appendChild(
        circle
    );


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
            x - 6
        );

        image.setAttribute(
            "y",
            y - 6
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
            "preserveAspectRatio",
            "xMidYMid slice"
        );


        image.setAttribute(
            "href",
            player.profilePictureUrl
        );


        const clipId =
            `playerClip_${index}`;


        const defs =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "defs"
            );


        const clipPath =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "clipPath"
            );


        clipPath.setAttribute(
            "id",
            clipId
        );


        const clipCircle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
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
            6
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
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );


        text.setAttribute(
            "x",
            x
        );

        text.setAttribute(
            "y",
            y + 4
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
            "●";


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

        timerIcon.textContent =
            "💎";

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
