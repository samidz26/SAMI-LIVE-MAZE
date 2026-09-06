function createMonsterManager(options = {}) {

    const {
        mazeSize,
        getMaze,
        getPlayers,
        broadcastState,
        onCatchPlayer
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

        broadcastState();
    }


    function isCellOccupied(x, y) {

        for (const player of getPlayers().values()) {

            if (
                player.x === x &&
                player.y === y &&
                player.alive !== false
            ) {
                return true;
            }
        }

        for (const monster of monsters) {

            if (
                monster.x === x &&
                monster.y === y
            ) {
                return true;
            }
        }

        return false;
    }


    function getRandomFreeCell() {

        const maze = getMaze();

        if (!maze || !maze.length)
            return null;


        const cells = [];


        for (
            let y = 0;
            y < mazeSize;
            y++
        ) {

            for (
                let x = 0;
                x < mazeSize;
                x++
            ) {

                if (
                    !isCellOccupied(x, y)
                ) {

                    cells.push({
                        x,
                        y
                    });
                }
            }
        }


        if (!cells.length)
            return null;


        return cells[
            Math.floor(
                Math.random() *
                cells.length
            )
        ];
    }


    function spawnMonsters(count = 1) {

        clearMonsterTimer();

        monsters = [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            const cell =
                getRandomFreeCell();


            if (!cell)
                continue;


            monsters.push({

                id:
                    `monster-${i + 1}`,

                x: cell.x,

                y: cell.y
            });
        }


        broadcastState();

        return monsters;
    }


    function findNearestPlayer(monster) {

        let nearest = null;
        let shortestDistance = Infinity;


        for (
            const player
            of getPlayers().values()
        ) {

            if (
                player.alive === false ||
                player.caught === true ||
                player.x === null ||
                player.y === null
            ) {
                continue;
            }


            const distance =
                Math.abs(
                    player.x - monster.x
                ) +
                Math.abs(
                    player.y - monster.y
                );


            if (
                distance <
                shortestDistance
            ) {

                shortestDistance =
                    distance;

                nearest =
                    player;
            }
        }


        return nearest;
    }


    function findPath(start, target) {

        const maze = getMaze();

        if (!maze || !maze.length)
            return [];


        const queue = [
            {
                x: start.x,
                y: start.y,
                path: []
            }
        ];


        const visited =
            new Set([
                `${start.x},${start.y}`
            ]);


        const directions = [
            {
                dx: 0,
                dy: -1,
                wall: "top"
            },
            {
                dx: 0,
                dy: 1,
                wall: "bottom"
            },
            {
                dx: 1,
                dy: 0,
                wall: "right"
            },
            {
                dx: -1,
                dy: 0,
                wall: "left"
            }
        ];


        while (queue.length) {

            const current =
                queue.shift();


            if (
                current.x === target.x &&
                current.y === target.y
            ) {

                return current.path;
            }


            const cell =
                maze[current.y]?.[
                    current.x
                ];


            if (!cell)
                continue;


            for (
                const direction
                of directions
            ) {

                if (
                    cell.walls?.[
                        direction.wall
                    ]
                ) {
                    continue;
                }


                const nx =
                    current.x +
                    direction.dx;

                const ny =
                    current.y +
                    direction.dy;


                if (
                    nx < 0 ||
                    nx >= mazeSize ||
                    ny < 0 ||
                    ny >= mazeSize
                ) {
                    continue;
                }


                const key =
                    `${nx},${ny}`;


                if (
                    visited.has(key)
                ) {
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


    function checkCollision(player) {

        if (!player)
            return false;


        for (
            const monster
            of monsters
        ) {

            if (
                monster.x === player.x &&
                monster.y === player.y
            ) {

                if (
                    typeof onCatchPlayer ===
                    "function"
                ) {

                    onCatchPlayer(player);
                }

                return true;
            }
        }


        return false;
    }


    function moveMonsters() {

        const players =
            getPlayers();


        for (
            const monster
            of monsters
        ) {

            const target =
                findNearestPlayer(
                    monster
                );


            if (!target)
                continue;


            const path =
                findPath(
                    monster,
                    target
                );


            if (!path.length)
                continue;


            const next =
                path[0];


            monster.x =
                next.x;

            monster.y =
                next.y;


            for (
                const player
                of players.values()
            ) {

                if (
                    player.alive === false ||
                    player.caught === true
                ) {
                    continue;
                }


                if (
                    player.x === monster.x &&
                    player.y === monster.y
                ) {

                    if (
                        typeof onCatchPlayer ===
                        "function"
                    ) {

                        onCatchPlayer(
                            player
                        );
                    }
                }
            }
        }


        broadcastState();
    }


    function startAI(speed = 1000) {

        clearMonsterTimer();


        monsterTimer =
            setInterval(() => {

                moveMonsters();

            }, speed);
    }


    return {

        getMonsters,

        spawnMonsters,

        clearMonsters,

        clearMonsterTimer,

        checkCollision,

        moveMonsters,

        startAI,

        findPath,

        findNearestPlayer
    };
}


module.exports = {
    createMonsterManager
};
