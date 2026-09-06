function createMonsterManager(options) {

    const {
        getMaze,
        getPlayers,
        mazeSize,
        broadcastState,
        onPlayerCaught,
        onNahroushCaught
    } = options;

    let monsters = [];
    let monsterTimer = null;

    function getMonsters() {
        return monsters;
    }

    function clearMonsterTimer() {

        if (monsterTimer) {
            clearInterval(monsterTimer);
            monsterTimer = null;
        }
    }

    function clearMonsters() {

        clearMonsterTimer();
        monsters = [];
    }

    function isCellOccupied(x, y) {

        const players = getPlayers();

        for (const player of players.values()) {

            if (
                player.x === x &&
                player.y === y &&
                player.alive !== false &&
                player.caught !== true
            ) {
                return true;
            }
        }

        return false;
    }

    function getRandomFreeCell() {

        const maze = getMaze();

        const cells = [];

        for (let y = 0; y < mazeSize; y++) {

            for (let x = 0; x < mazeSize; x++) {

                if (!isCellOccupied(x, y)) {

                    cells.push({
                        x,
                        y
                    });
                }
            }
        }

        if (cells.length === 0) {
            return null;
        }

        return cells[
            Math.floor(Math.random() * cells.length)
        ];
    }

    function spawnMonsters(count = 1) {

        clearMonsterTimer();

        monsters = [];

        for (let i = 0; i < count; i++) {

            let position;

            if (i === 0) {

                const center = Math.floor(mazeSize / 2);

                position = {
                    x: center,
                    y: center
                };

            } else {

                position = getRandomFreeCell();
            }

            if (!position) {
                continue;
            }

            monsters.push({
                id: `monster-${i + 1}`,
                x: position.x,
                y: position.y
            });
        }

        broadcastState();
    }

    function findPath(start, target) {

        const maze = getMaze();

        if (!start || !target) {
            return [];
        }

        const queue = [
            {
                x: start.x,
                y: start.y,
                path: []
            }
        ];

        const visited = new Set();

        visited.add(`${start.x},${start.y}`);

        while (queue.length > 0) {

            const current = queue.shift();

            if (
                current.x === target.x &&
                current.y === target.y
            ) {
                return current.path;
            }

            const cell = maze[current.y]?.[current.x];

            if (!cell) {
                continue;
            }

            const directions = [
                {
                    x: 0,
                    y: -1,
                    wall: "top"
                },
                {
                    x: 0,
                    y: 1,
                    wall: "bottom"
                },
                {
                    x: 1,
                    y: 0,
                    wall: "right"
                },
                {
                    x: -1,
                    y: 0,
                    wall: "left"
                }
            ];

            for (const direction of directions) {

                if (cell.walls[direction.wall]) {
                    continue;
                }

                const nx = current.x + direction.x;
                const ny = current.y + direction.y;

                if (
                    nx < 0 ||
                    nx >= mazeSize ||
                    ny < 0 ||
                    ny >= mazeSize
                ) {
                    continue;
                }

                const key = `${nx},${ny}`;

                if (visited.has(key)) {
                    continue;
                }

                visited.add(key);

                queue.push({
                    x: nx,
                    y: ny,
                    path: [
                        ...current.path,
                        {
                            x: nx,
                            y: ny
                        }
                    ]
                });
            }
        }

        return [];
    }

    function getNearestPlayer(monster) {

        const players = getPlayers();

        let nearest = null;
        let shortestDistance = Infinity;

        for (const player of players.values()) {

            if (player.alive === false) {
                continue;
            }

            if (player.caught === true) {
                continue;
            }

            if (
                player.x === null ||
                player.y === null
            ) {
                continue;
            }

            const distance =
                Math.abs(monster.x - player.x) +
                Math.abs(monster.y - player.y);

            if (distance < shortestDistance) {

                shortestDistance = distance;
                nearest = player;
            }
        }

        return nearest;
    }

    function checkCollision(monster) {

        const players = getPlayers();

        for (const player of players.values()) {

            if (
                player.x !== monster.x ||
                player.y !== monster.y
            ) {
                continue;
            }

            if (player.isNahroush) {

                if (typeof onNahroushCaught === "function") {
                    onNahroushCaught(player, monster);
                }

            } else {

                if (typeof onPlayerCaught === "function") {
                    onPlayerCaught(player, monster);
                }
            }
        }
    }

    function moveMonsters() {

        const players = getPlayers();

        if (players.size === 0) {
            return;
        }

        for (const monster of monsters) {

            const target = getNearestPlayer(monster);

            if (!target) {
                continue;
            }

            const path = findPath(
                {
                    x: monster.x,
                    y: monster.y
                },
                {
                    x: target.x,
                    y: target.y
                }
            );

            if (path.length > 0) {

                monster.x = path[0].x;
                monster.y = path[0].y;
            }

            checkCollision(monster);
        }

        broadcastState();
    }

    function startAI(speed = 1000) {

        clearMonsterTimer();

        monsterTimer = setInterval(() => {

            moveMonsters();

        }, Math.max(100, speed));
    }

    return {
        getMonsters,
        spawnMonsters,
        moveMonsters,
        startAI,
        clearMonsterTimer,
        clearMonsters,
        findPath,
        getNearestPlayer
    };
}

module.exports = {
    createMonsterManager
};
