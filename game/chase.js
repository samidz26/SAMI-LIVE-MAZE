function createChaseManager(options = {}) {

    const {
        getPlayers,
        broadcastState,
        roundDuration = 60,
        onEnd
    } = options;

    let timer = null;
    let timeLeft = roundDuration;
    let running = false;


    function getTimeLeft() {
        return timeLeft;
    }


    function isRunning() {
        return running;
    }


    function clearTimer() {

        if (timer) {

            clearInterval(timer);
            timer = null;
        }
    }


    function start() {

        clearTimer();

        running = true;

        timeLeft =
            roundDuration;

        broadcastState();


        timer =
            setInterval(() => {

                if (!running) {

                    clearTimer();

                    return;
                }


                timeLeft--;

                broadcastState();


                if (timeLeft <= 0) {

                    clearTimer();

                    running = false;


                    if (
                        typeof onEnd ===
                        "function"
                    ) {

                        onEnd({

                            type: "time",

                            winner: null
                        });
                    }


                    broadcastState();
                }

            }, 1000);
    }


    function end(result = {}) {

        if (!running)
            return;


        clearTimer();

        running = false;


        if (
            typeof onEnd ===
            "function"
        ) {

            onEnd(result);
        }


        broadcastState();
    }


    function checkPlayers() {

        const players =
            getPlayers();


        const alivePlayers =
            Array.from(
                players.values()
            ).filter(player =>
                player.alive !== false &&
                player.caught !== true
            );


        return alivePlayers;
    }


    function reset() {

        clearTimer();

        running = false;

        timeLeft =
            roundDuration;

        broadcastState();
    }


    return {

        start,

        end,

        reset,

        clearTimer,

        checkPlayers,

        getTimeLeft,

        isRunning
    };
}


module.exports = {
    createChaseManager
};
