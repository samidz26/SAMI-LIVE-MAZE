function movePlayer(uniqueId, direction, options) {

    const {
        players,
        maze,
        mazeSize,
        gameStarted,
        broadcastState,
        onTreasureReached,
        onMonsterCollision
    } = options;

    if (!gameStarted) return;

    const player = players.get(uniqueId);

    if (!player) return;
    if (player.alive === false) return;
    if (player.caught === true) return;

    if (
        player.x === null ||
        player.y === null
    ) {
        return;
    }

    let nx = player.x;
    let ny = player.y;

    const command = String(direction || "")
        .trim()
        .toLowerCase();

    /*
    =========================================
    MOVEMENT
    =========================================
    */

    if (
        command === "u" ||
        command === "up" ||
        command === "أعلى" ||
        command === "فوق"
    ) {
        if (!maze[player.y][player.x].walls.top) {
            ny--;
        }
    }

    else if (
        command === "d" ||
        command === "down" ||
        command === "أسفل" ||
        command === "تحت"
    ) {
        if (!maze[player.y][player.x].walls.bottom) {
            ny++;
        }
    }

    else if (
        command === "r" ||
        command === "right" ||
        command === "يمين"
    ) {
        if (!maze[player.y][player.x].walls.right) {
            nx++;
        }
    }

    else if (
        command === "l" ||
        command === "left" ||
        command === "يسار"
    ) {
        if (!maze[player.y][player.x].walls.left) {
            nx--;
        }
    }

    else {
        return;
    }

    /*
    =========================================
    BOUNDARIES
    =========================================
    */

    if (
        nx < 0 ||
        nx >= mazeSize ||
        ny < 0 ||
        ny >= mazeSize
    ) {
        return;
    }

    /*
    =========================================
    MOVE
    =========================================
    */

    player.x = nx;
    player.y = ny;

    /*
    =========================================
    TREASURE
    =========================================
    */

    if (typeof onTreasureReached === "function") {
        onTreasureReached(player);
    }

    /*
    =========================================
    MONSTER COLLISION
    =========================================
    */

    if (typeof onMonsterCollision === "function") {
        onMonsterCollision(player);
    }

    /*
    =========================================
    BROADCAST
    =========================================
    */

    if (typeof broadcastState === "function") {
        broadcastState();
    }
}


module.exports = {
    movePlayer
};
