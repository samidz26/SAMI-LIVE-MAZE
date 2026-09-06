const MAZE_SIZE = 12;

/* =====================================================
   ARENA MAZE GENERATION
   ===================================================== */

function createMaze() {

    const grid = [];

    /* =====================================
       CREATE GRID
    ====================================== */

    for (let y = 0; y < MAZE_SIZE; y++) {

        const row = [];

        for (let x = 0; x < MAZE_SIZE; x++) {

            row.push({

                x,
                y,

                walls: {

                    top: true,
                    right: true,
                    bottom: true,
                    left: true

                },

                visited: false

            });

        }

        grid.push(row);

    }

    /* =====================================
       DIRECTIONS
    ====================================== */

    const directions = [

        {
            dx: 0,
            dy: -1,
            wall: "top",
            opposite: "bottom"
        },

        {
            dx: 1,
            dy: 0,
            wall: "right",
            opposite: "left"
        },

        {
            dx: 0,
            dy: 1,
            wall: "bottom",
            opposite: "top"
        },

        {
            dx: -1,
            dy: 0,
            wall: "left",
            opposite: "right"
        }

    ];

    /* =====================================
       RANDOMIZED DFS
    ====================================== */

    const stack = [];

    const startX =
        Math.floor(
            Math.random() * MAZE_SIZE
        );

    const startY =
        Math.floor(
            Math.random() * MAZE_SIZE
        );

    grid[startY][startX].visited = true;

    stack.push(
        grid[startY][startX]
    );

    while (stack.length > 0) {

        const current =
            stack[stack.length - 1];

        const neighbors = [];

        for (const direction of directions) {

            const nx =
                current.x +
                direction.dx;

            const ny =
                current.y +
                direction.dy;

            if (
                nx < 0 ||
                nx >= MAZE_SIZE ||
                ny < 0 ||
                ny >= MAZE_SIZE
            ) {

                continue;

            }

            const neighbor =
                grid[ny][nx];

            if (!neighbor.visited) {

                neighbors.push({
                    neighbor,
                    direction
                });

            }

        }

        if (neighbors.length === 0) {

            stack.pop();

            continue;

        }

        const chosen =
            neighbors[
                Math.floor(
                    Math.random() *
                    neighbors.length
                )
            ];

        const neighbor =
            chosen.neighbor;

        const direction =
            chosen.direction;

        current.walls[
            direction.wall
        ] = false;

        neighbor.walls[
            direction.opposite
        ] = false;

        neighbor.visited = true;

        stack.push(
            neighbor
        );

    }

    /* =====================================
       OPEN BETWEEN CELLS
    ====================================== */

    function openBetween(
        x1,
        y1,
        x2,
        y2
    ) {

        if (
            x1 < 0 ||
            x1 >= MAZE_SIZE ||
            y1 < 0 ||
            y1 >= MAZE_SIZE ||
            x2 < 0 ||
            x2 >= MAZE_SIZE ||
            y2 < 0 ||
            y2 >= MAZE_SIZE
        ) {

            return false;

        }

        const a =
            grid[y1][x1];

        const b =
            grid[y2][x2];

        if (x2 === x1 + 1) {

            a.walls.right = false;
            b.walls.left = false;

        }

        else if (x2 === x1 - 1) {

            a.walls.left = false;
            b.walls.right = false;

        }

        else if (y2 === y1 + 1) {

            a.walls.bottom = false;
            b.walls.top = false;

        }

        else if (y2 === y1 - 1) {

            a.walls.top = false;
            b.walls.bottom = false;

        }

        else {

            return false;

        }

        return true;

    }

    /* =====================================
       CELL DEGREE
    ====================================== */

    function getDegree(x, y) {

        const cell =
            grid[y][x];

        let degree = 0;

        if (
            !cell.walls.top &&
            y > 0
        ) {

            degree++;

        }

        if (
            !cell.walls.right &&
            x < MAZE_SIZE - 1
        ) {

            degree++;

        }

        if (
            !cell.walls.bottom &&
            y < MAZE_SIZE - 1
        ) {

            degree++;

        }

        if (
            !cell.walls.left &&
            x > 0
        ) {

            degree++;

        }

        return degree;

    }

    /* =====================================
       CLOSED INTERNAL WALLS
    ====================================== */

    function getClosedInternalWalls() {

        const walls = [];

        for (let y = 0; y < MAZE_SIZE; y++) {

            for (let x = 0; x < MAZE_SIZE; x++) {

                if (x < MAZE_SIZE - 1) {

                    if (
                        grid[y][x].walls.right
                    ) {

                        walls.push({

                            x1: x,
                            y1: y,

                            x2: x + 1,
                            y2: y

                        });

                    }

                }

                if (y < MAZE_SIZE - 1) {

                    if (
                        grid[y][x].walls.bottom
                    ) {

                        walls.push({

                            x1: x,
                            y1: y,

                            x2: x,
                            y2: y + 1

                        });

                    }

                }

            }

        }

        return walls;

    }

    /* =====================================
       CREATE LOOPS
    ====================================== */

    let loopCandidates =
        getClosedInternalWalls();

    loopCandidates.sort(
        () => Math.random() - 0.5
    );

    let loopsCreated = 0;

    const TARGET_LOOPS = 10;

    for (
        const wall of loopCandidates
    ) {

        if (
            loopsCreated >= TARGET_LOOPS
        ) {

            break;

        }

        const degreeA =
            getDegree(
                wall.x1,
                wall.y1
            );

        const degreeB =
            getDegree(
                wall.x2,
                wall.y2
            );

        if (
            degreeA + degreeB <= 4
        ) {

            openBetween(
                wall.x1,
                wall.y1,
                wall.x2,
                wall.y2
            );

            loopsCreated++;

        }

    }

    /* =====================================
       CENTRAL ARENA
    ====================================== */

    openBetween(
        5,
        5,
        6,
        5
    );

    openBetween(
        5,
        5,
        5,
        6
    );

    openBetween(
        6,
        5,
        6,
        6
    );

    openBetween(
        5,
        6,
        6,
        6
    );

    /* =====================================
       CENTER ESCAPE ROUTES
    ====================================== */

    const centerRoutes = [

        {
            x1: 6,
            y1: 6,
            x2: 7,
            y2: 6
        },

        {
            x1: 6,
            y1: 6,
            x2: 6,
            y2: 7
        },

        {
            x1: 5,
            y1: 5,
            x2: 4,
            y2: 5
        },

        {
            x1: 5,
            y1: 5,
            x2: 5,
            y2: 4
        }

    ];

    centerRoutes.sort(
        () => Math.random() - 0.5
    );

    let centerConnections = 0;

    for (
        const route of centerRoutes
    ) {

        if (
            centerConnections >= 2
        ) {

            break;

        }

        if (
            route.x2 >= 0 &&
            route.x2 < MAZE_SIZE &&
            route.y2 >= 0 &&
            route.y2 < MAZE_SIZE
        ) {

            const cell =
                grid[route.y1][route.x1];

            let alreadyOpen = false;

            if (
                route.x2 ===
                route.x1 + 1
            ) {

                alreadyOpen =
                    !cell.walls.right;

            }

            else if (
                route.x2 ===
                route.x1 - 1
            ) {

                alreadyOpen =
                    !cell.walls.left;

            }

            else if (
                route.y2 ===
                route.y1 + 1
            ) {

                alreadyOpen =
                    !cell.walls.bottom;

            }

            else if (
                route.y2 ===
                route.y1 - 1
            ) {

                alreadyOpen =
                    !cell.walls.top;

            }

            if (!alreadyOpen) {

                openBetween(
                    route.x1,
                    route.y1,
                    route.x2,
                    route.y2
                );

                centerConnections++;

            }

        }

    }

    /* =====================================
       REDUCE DEAD ENDS
    ====================================== */

    let deadEndCandidates = [];

    for (
        let y = 1;
        y < MAZE_SIZE - 1;
        y++
    ) {

        for (
            let x = 1;
            x < MAZE_SIZE - 1;
            x++
        ) {

            if (
                getDegree(x, y) === 1
            ) {

                deadEndCandidates.push({
                    x,
                    y
                });

            }

        }

    }

    deadEndCandidates.sort(
        () => Math.random() - 0.5
    );

    let deadEndsOpened = 0;

    const MAX_DEAD_END_OPENINGS = 8;

    for (
        const cell of deadEndCandidates
    ) {

        if (
            deadEndsOpened >=
            MAX_DEAD_END_OPENINGS
        ) {

            break;

        }

        const possibleWalls =
            getClosedInternalWalls()
                .filter(
                    wall =>
                        (
                            wall.x1 === cell.x &&
                            wall.y1 === cell.y
                        ) ||
                        (
                            wall.x2 === cell.x &&
                            wall.y2 === cell.y
                        )
                );

        if (
            possibleWalls.length === 0
        ) {

            continue;

        }

        possibleWalls.sort(
            (a, b) => {

                const aOther =
                    a.x1 === cell.x &&
                    a.y1 === cell.y
                        ? [a.x2, a.y2]
                        : [a.x1, a.y1];

                const bOther =
                    b.x1 === cell.x &&
                    b.y1 === cell.y
                        ? [b.x2, b.y2]
                        : [b.x1, b.y1];

                return (
                    getDegree(
                        aOther[0],
                        aOther[1]
                    ) -
                    getDegree(
                        bOther[0],
                        bOther[1]
                    )
                );

            }
        );

        const selected =
            possibleWalls[0];

        if (!selected) {

            continue;

        }

        openBetween(
            selected.x1,
            selected.y1,
            selected.x2,
            selected.y2
        );

        deadEndsOpened++;

    }

    /* =====================================
       FORCE OUTER BORDER CLOSED
    ====================================== */

    for (
        let x = 0;
        x < MAZE_SIZE;
        x++
    ) {

        grid[0][x].walls.top = true;

        grid[MAZE_SIZE - 1][x]
            .walls.bottom = true;

    }

    for (
        let y = 0;
        y < MAZE_SIZE;
        y++
    ) {

        grid[y][0].walls.left = true;

        grid[y][MAZE_SIZE - 1]
            .walls.right = true;

    }

    /* =====================================
       RESET VISITED
    ====================================== */

    for (
        let y = 0;
        y < MAZE_SIZE;
        y++
    ) {

        for (
            let x = 0;
            x < MAZE_SIZE;
            x++
        ) {

            grid[y][x].visited = false;

        }

    }

    return grid;

}

/* =====================================================
   EXPORT
===================================================== */

module.exports = {
    createMaze,
    MAZE_SIZE
};
