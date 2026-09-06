function createTreasureManager(options = {}) {

    const {
        mazeSize,
        getMaze,
        getPlayers,
        broadcastState,
        onWinner,
        duration = 10
    } = options;

    let treasure = null;
    let treasureTimer = null;
    let treasureTimeLeft = 0;


    function getTreasure() {
        return treasure;
    }


    function getTreasureTimeLeft() {
        return treasureTimeLeft;
    }


    function clearTreasureTimer() {

        if (treasureTimer) {

            clearInterval(treasureTimer);
            treasureTimer = null;
        }
    }


    function getRandomFreeCell() {

        const maze = getMaze();
        const players = getPlayers();

        if (!maze || !maze.length)
            return null;


        const occupied = new Set();


        for (
            const player
            of players.values()
        ) {

            if (
                player.x !== null &&
                player.y !== null
            ) {

                occupied.add(
                    `${player.x},${player.y}`
                );
            }
        }


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

                const key =
                    `${x},${y}`;

                if (
                    !occupied.has(key)
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


    function spawnTreasure(
        firstSpawn = false
    ) {

        clearTreasureTimer();


        if (firstSpawn) {

            const center =
                Math.floor(
                    mazeSize / 2
                );

            treasure = {
                x: center,
                y: center
            };

        } else {

            treasure =
                getRandomFreeCell();
        }


        treasureTimeLeft =
            duration;


        broadcastState();


        treasureTimer =
            setInterval(() => {

                treasureTimeLeft--;

                broadcastState();


                if (
                    treasureTimeLeft <= 0
                ) {

                    clearTreasureTimer();

                    treasure = null;

                    broadcastState();


                    setTimeout(() => {

                        spawnTreasure(false);

                    }, 250);
                }

            }, 1000);
    }


    function checkTreasure(player) {

        if (!treasure)
            return false;

        if (!player)
            return false;


        if (
            player.x === treasure.x &&
            player.y === treasure.y
        ) {

            clearTreasureTimer();


            const winner =
                player;


            treasure = null;

            treasureTimeLeft = 0;


            if (
                typeof onWinner ===
                "function"
            ) {

                onWinner(winner);
            }


            broadcastState();

            return true;
        }


        return false;
    }


    function resetTreasure() {

        clearTreasureTimer();

        treasure = null;

        treasureTimeLeft = 0;

        broadcastState();
    }


    return {

        getTreasure,

        getTreasureTimeLeft,

        spawnTreasure,

        checkTreasure,

        resetTreasure,

        clearTreasureTimer
    };
}


module.exports = {
    createTreasureManager
};
