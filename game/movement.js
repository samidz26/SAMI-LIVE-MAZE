/**
 * ============================================================
 * PLAYER MOVEMENT SYSTEM
 * ============================================================
 *
 * مسؤول عن:
 * - استقبال أمر الحركة
 * - توحيد أوامر العربية والإنجليزية
 * - التحقق من حالة اللاعب
 * - التحقق من حدود المتاهة
 * - التحقق من الجدران
 * - منع الحركة غير الصالحة
 * - تحديث موقع اللاعب بشكل ذري
 * - تشغيل treasure / monster callbacks
 * - إرسال الحالة إلى جميع العملاء
 *
 * متوافق مع:
 * u / d / l / r
 * up / down / left / right
 * أعلى / أسفل / فوق / تحت / يمين / يسار
 * ============================================================
 */


/* ============================================================
   NORMALIZE MOVEMENT COMMAND
============================================================ */

function normalizeDirection(direction) {

    if (direction === null || direction === undefined) {
        return null;
    }

    const command = String(direction)
        .trim()
        .toLowerCase();

    switch (command) {

        // UP
        case "u":
        case "up":
        case "upward":
        case "north":
        case "أعلى":
        case "فوق":
        case "الى فوق":
        case "إلى فوق":
        case "لأعلى":
        case "للاعلى":
        case "للأعلى":
        case "شمال":
            return "up";


        // DOWN
        case "d":
        case "down":
        case "downward":
        case "south":
        case "أسفل":
        case "اسفل":
        case "تحت":
        case "الى تحت":
        case "إلى تحت":
        case "للأسفل":
        case "للاسفل":
        case "جنوب":
            return "down";


        // RIGHT
        case "r":
        case "right":
        case "east":
        case "يمين":
        case "الى اليمين":
        case "إلى اليمين":
        case "لليمين":
        case "شرق":
            return "right";


        // LEFT
        case "l":
        case "left":
        case "west":
        case "يسار":
        case "الى اليسار":
        case "إلى اليسار":
        case "لليسار":
        case "غرب":
            return "left";


        default:
            return null;
    }
}


/* ============================================================
   SAFE INTEGER CHECK
============================================================ */

function isValidInteger(value) {

    return Number.isInteger(value);
}


/* ============================================================
   GET CURRENT CELL
============================================================ */

function getCurrentCell(
    maze,
    x,
    y,
    mazeSize
) {

    if (!Array.isArray(maze)) {
        return null;
    }

    if (
        !isValidInteger(x) ||
        !isValidInteger(y)
    ) {
        return null;
    }

    if (
        x < 0 ||
        x >= mazeSize ||
        y < 0 ||
        y >= mazeSize
    ) {
        return null;
    }

    if (!Array.isArray(maze[y])) {
        return null;
    }

    const cell = maze[y][x];

    if (!cell || typeof cell !== "object") {
        return null;
    }

    if (
        !cell.walls ||
        typeof cell.walls !== "object"
    ) {
        return null;
    }

    return cell;
}


/* ============================================================
   CHECK TARGET CELL
============================================================ */

function isValidTargetCell(
    maze,
    x,
    y,
    mazeSize
) {

    if (
        !isValidInteger(x) ||
        !isValidInteger(y)
    ) {
        return false;
    }

    if (
        x < 0 ||
        x >= mazeSize ||
        y < 0 ||
        y >= mazeSize
    ) {
        return false;
    }

    if (!Array.isArray(maze[y])) {
        return false;
    }

    return !!maze[y][x];
}


/* ============================================================
   CHECK WALL
============================================================ */

function hasWall(cell, direction) {

    if (!cell || !cell.walls) {
        return true;
    }

    switch (direction) {

        case "up":
            return cell.walls.top === true;

        case "down":
            return cell.walls.bottom === true;

        case "left":
            return cell.walls.left === true;

        case "right":
            return cell.walls.right === true;

        default:
            return true;
    }
}


/* ============================================================
   CHECK OPPOSITE WALL
   حماية إضافية من بيانات متاهة غير متناسقة
============================================================ */

function hasOppositeWall(
    cell,
    direction
) {

    if (!cell || !cell.walls) {
        return true;
    }

    switch (direction) {

        case "up":
            return cell.walls.bottom === true;

        case "down":
            return cell.walls.top === true;

        case "left":
            return cell.walls.right === true;

        case "right":
            return cell.walls.left === true;

        default:
            return true;
    }
}


/* ============================================================
   CALCULATE TARGET POSITION
============================================================ */

function calculateTarget(
    x,
    y,
    direction
) {

    let nx = x;
    let ny = y;

    switch (direction) {

        case "up":
            ny--;
            break;

        case "down":
            ny++;
            break;

        case "left":
            nx--;
            break;

        case "right":
            nx++;
            break;

        default:
            return null;
    }

    return {
        x: nx,
        y: ny
    };
}


/* ============================================================
   MOVE PLAYER
============================================================ */

function movePlayer(
    uniqueId,
    direction,
    options
) {

    /*
     * --------------------------------------------------------
     * Validate options
     * --------------------------------------------------------
     */

    if (
        !options ||
        typeof options !== "object"
    ) {
        console.warn(
            "[MOVEMENT] Invalid options"
        );

        return {
            success: false,
            reason: "invalid_options"
        };
    }


    const {
        players,
        maze,
        mazeSize,
        gameStarted,
        broadcastState,
        onTreasureReached,
        onMonsterCollision
    } = options;


    /*
     * --------------------------------------------------------
     * Validate players
     * --------------------------------------------------------
     */

    if (
        !players ||
        typeof players.get !== "function"
    ) {

        console.warn(
            "[MOVEMENT] Players collection unavailable"
        );

        return {
            success: false,
            reason: "players_unavailable"
        };
    }


    /*
     * --------------------------------------------------------
     * Game must be running
     * --------------------------------------------------------
     */

    if (!gameStarted) {

        return {
            success: false,
            reason: "game_not_started"
        };
    }


    /*
     * --------------------------------------------------------
     * Find player
     * --------------------------------------------------------
     */

    const player =
        players.get(uniqueId);


    if (!player) {

        return {
            success: false,
            reason: "player_not_found"
        };
    }


    /*
     * --------------------------------------------------------
     * Player must be alive
     * --------------------------------------------------------
     */

    if (player.alive === false) {

        return {
            success: false,
            reason: "player_dead"
        };
    }


    /*
     * --------------------------------------------------------
     * Player must not be caught
     * --------------------------------------------------------
     */

    if (player.caught === true) {

        return {
            success: false,
            reason: "player_caught"
        };
    }


    /*
     * --------------------------------------------------------
     * Validate player coordinates
     * --------------------------------------------------------
     */

    if (
        !isValidInteger(player.x) ||
        !isValidInteger(player.y)
    ) {

        console.warn(
            "[MOVEMENT] Invalid player coordinates:",
            uniqueId,
            player.x,
            player.y
        );

        return {
            success: false,
            reason: "invalid_position"
        };
    }


    /*
     * --------------------------------------------------------
     * Validate maze size
     * --------------------------------------------------------
     */

    if (
        !isValidInteger(mazeSize) ||
        mazeSize <= 0
    ) {

        console.warn(
            "[MOVEMENT] Invalid mazeSize:",
            mazeSize
        );

        return {
            success: false,
            reason: "invalid_maze_size"
        };
    }


    /*
     * --------------------------------------------------------
     * Normalize command
     * --------------------------------------------------------
     */

    const normalizedDirection =
        normalizeDirection(direction);


    if (!normalizedDirection) {

        console.log(
            `[MOVEMENT] Invalid command: ${direction}`
        );

        return {
            success: false,
            reason: "invalid_direction",
            direction
        };
    }


    /*
     * --------------------------------------------------------
     * Get current cell
     * --------------------------------------------------------
     */

    const currentCell =
        getCurrentCell(
            maze,
            player.x,
            player.y,
            mazeSize
        );


    if (!currentCell) {

        console.warn(
            "[MOVEMENT] Current cell unavailable:",
            {
                uniqueId,
                x: player.x,
                y: player.y
            }
        );

        return {
            success: false,
            reason: "invalid_current_cell"
        };
    }


    /*
     * --------------------------------------------------------
     * Calculate target
     * --------------------------------------------------------
     */

    const target =
        calculateTarget(
            player.x,
            player.y,
            normalizedDirection
        );


    if (!target) {

        return {
            success: false,
            reason: "invalid_target"
        };
    }


    const nx = target.x;
    const ny = target.y;


    /*
     * --------------------------------------------------------
     * Boundary check
     * --------------------------------------------------------
     */

    if (
        nx < 0 ||
        nx >= mazeSize ||
        ny < 0 ||
        ny >= mazeSize
    ) {

        return {
            success: false,
            reason: "boundary",
            direction: normalizedDirection,
            from: {
                x: player.x,
                y: player.y
            },
            to: {
                x: nx,
                y: ny
            }
        };
    }


    /*
     * --------------------------------------------------------
     * Target cell must exist
     * --------------------------------------------------------
     */

    if (
        !isValidTargetCell(
            maze,
            nx,
            ny,
            mazeSize
        )
    ) {

        console.warn(
            "[MOVEMENT] Target cell unavailable:",
            {
                x: nx,
                y: ny
            }
        );

        return {
            success: false,
            reason: "invalid_target_cell"
        };
    }


    /*
     * --------------------------------------------------------
     * WALL CHECK
     *
     * This is the most important part.
     * --------------------------------------------------------
     */

    if (
        hasWall(
            currentCell,
            normalizedDirection
        )
    ) {

        return {
            success: false,
            reason: "wall",
            direction: normalizedDirection,
            from: {
                x: player.x,
                y: player.y
            },
            to: {
                x: nx,
                y: ny
            }
        };
    }


    /*
     * --------------------------------------------------------
     * Check opposite wall on target cell
     *
     * We deliberately DO NOT block movement here.
     *
     * The current cell is the authoritative source for
     * movement. This prevents an accidentally inconsistent
     * opposite wall from making movement randomly fail.
     * --------------------------------------------------------
     */

    const targetCell =
        maze[ny][nx];

    if (
        targetCell &&
        targetCell.walls
    ) {

        const oppositeBlocked =
            hasOppositeWall(
                targetCell,
                normalizedDirection
            );

        /*
         * Only log the inconsistency.
         * Do not randomly cancel a valid move.
         */

        if (oppositeBlocked) {

            console.warn(
                "[MOVEMENT] Inconsistent maze walls:",
                {
                    from: {
                        x: player.x,
                        y: player.y
                    },
                    to: {
                        x: nx,
                        y: ny
                    },
                    direction:
                        normalizedDirection
                }
            );
        }
    }


    /*
     * --------------------------------------------------------
     * SAVE OLD POSITION
     * --------------------------------------------------------
     */

    const oldX = player.x;
    const oldY = player.y;


    /*
     * --------------------------------------------------------
     * ATOMIC POSITION UPDATE
     *
     * Only one place changes player coordinates.
     * --------------------------------------------------------
     */

    player.x = nx;
    player.y = ny;


    /*
     * --------------------------------------------------------
     * MOVEMENT LOG
     * --------------------------------------------------------
     */

    console.log(
        `[MOVEMENT] ${uniqueId}: ` +
        `${normalizedDirection} ` +
        `(${oldX},${oldY}) -> (${nx},${ny})`
    );


    /*
     * --------------------------------------------------------
     * TREASURE
     * --------------------------------------------------------
     */

    if (
        typeof onTreasureReached === "function"
    ) {

        try {

            onTreasureReached(player);

        } catch (error) {

            console.error(
                "[MOVEMENT] Treasure callback error:",
                error
            );
        }
    }


    /*
     * --------------------------------------------------------
     * MONSTER COLLISION
     * --------------------------------------------------------
     */

    if (
        typeof onMonsterCollision === "function"
    ) {

        try {

            onMonsterCollision(player);

        } catch (error) {

            console.error(
                "[MOVEMENT] Monster callback error:",
                error
            );
        }
    }


    /*
     * --------------------------------------------------------
     * BROADCAST NEW STATE
     * --------------------------------------------------------
     */

    if (
        typeof broadcastState === "function"
    ) {

        try {

            broadcastState();

        } catch (error) {

            console.error(
                "[MOVEMENT] Broadcast error:",
                error
            );
        }
    }


    /*
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */

    return {
        success: true,

        direction:
            normalizedDirection,

        from: {
            x: oldX,
            y: oldY
        },

        to: {
            x: nx,
            y: ny
        },

        player
    };
}


/* ============================================================
   EXPORT
============================================================ */

module.exports = {
    movePlayer,
    normalizeDirection
};
