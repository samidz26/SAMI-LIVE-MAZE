const socket = io();

const mazeSvg =
    document.getElementById("maze");

const winnerOverlay =
    document.getElementById("winnerOverlay");

const winnerAvatar =
    document.getElementById("winnerAvatar");

const winnerName =
    document.getElementById("winnerName");

const resetButton =
    document.getElementById("resetButton");


/* =========================================
   SETTINGS
========================================= */

const MAZE_SIZE = 15;
const CELL_SIZE = 20;


/* =========================================
   GAME STATE
========================================= */

let currentState = null;


/* =========================================
   RECEIVE GAME STATE
========================================= */

socket.on("game_state", (state) => {

    if (!state) return;

    currentState = state;

    renderMaze(state);

});


/* =========================================
   GAME STARTED
========================================= */

socket.on("game_started", (state) => {

    winnerOverlay.classList.add("hidden");

    currentState = state;

    renderMaze(state);

});


/* =========================================
   RENDER MAZE
========================================= */

function renderMaze(state) {

    if (!state) return;

    mazeSvg.innerHTML = "";

    const maze =
        state.maze || [];

    const players =
        state.players || [];

    const treasure =
        state.treasure;


    /*
        حجم SVG
    */

    const size =
        MAZE_SIZE * CELL_SIZE;

    mazeSvg.setAttribute(
        "viewBox",
        `0 0 ${size} ${size}`
    );


    /*
        خلفية المتاهة
    */

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


    /*
        رسم الجدران
    */

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


            /*
                Top
            */

            if (cell.walls?.top) {

                drawWall(
                    x,
                    y,
                    x + CELL_SIZE,
                    y
                );

            }


            /*
                Right
            */

            if (cell.walls?.right) {

                drawWall(
                    x + CELL_SIZE,
                    y,
                    x + CELL_SIZE,
                    y + CELL_SIZE
                );

            }


            /*
                Bottom
            */

            if (cell.walls?.bottom) {

                drawWall(
                    x,
                    y + CELL_SIZE,
                    x + CELL_SIZE,
                    y + CELL_SIZE
                );

            }


            /*
                Left
            */

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


    /*
        رسم الكنز
    */

    if (treasure) {

        drawTreasure(
            treasure.x,
            treasure.y
        );

    }


    /*
        رسم اللاعبين
    */

    players.forEach(
        (player, index) => {

            drawPlayer(
                player,
                index
            );

        }
    );

}


/* =========================================
   DRAW WALL
========================================= */

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


/* =========================================
   DRAW TREASURE
========================================= */

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
        7
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
        y + 4
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


/* =========================================
   DRAW PLAYER
========================================= */

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
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );


    group.setAttribute(
        "class",
        "maze-player"
    );


    /*
        دائرة خلف الصورة
    */

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
        7
    );


    group.appendChild(
        circle
    );


    /*
        صورة اللاعب
    */

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


        /*
            قص الصورة بشكل دائري
        */

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
            5.5
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


        group.appendChild(
            image
        );

    }
    else {

        /*
            صورة احتياطية
        */

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
            y + 3
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


/* =========================================
   WINNER
========================================= */

socket.on(
    "game_winner",
    (winner) => {

        if (!winner) return;


        winnerName.textContent =
            winner.nickname ||
            "الفائز";


        winnerAvatar.src =
            winner.profilePictureUrl ||
            "";


        winnerAvatar.onerror =
            () => {

                winnerAvatar.src =
                    "data:image/svg+xml," +
                    encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg"
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

            };


        winnerOverlay.classList.remove(
            "hidden"
        );

    }
);


/* =========================================
   RESET / NEW ROUND
========================================= */

resetButton.addEventListener(
    "click",
    () => {

        resetButton.disabled = true;

        socket.emit(
            "reset_game"
        );

        /*
            العودة مباشرة إلى
            صفحة تسجيل اللاعبين
        */

        window.location.href =
            "/registration.html";

    }
);
