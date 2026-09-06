function createChaseManager(options) {

    const {
        getPlayers,
        getMonsters,
        startMonsterAI,
        stopMonsterAI,
        broadcastState,
        onChaseEnded
    } = options;

    let chaseTimer = null;
    let timeLeft = 0;
    let running = false;

    function getTimeLeft() {
        return timeLeft;
    }

    function isRunning() {
        return running;
    }

    function clearTimer() {

        if (chaseTimer) {
            clearInterval(chaseTimer);
            chaseTimer = null;
        }
    }

    function start(duration = 60, monsterSpeed = 1000) {

        clearTimer();

        running = true;
        timeLeft = duration;

        if (typeof startMonsterAI === "function") {
            startMonsterAI(monsterSpeed);
        }

        broadcastState();

        chaseTimer = setInterval(() => {

            timeLeft--;

            broadcastState();

            if (timeLeft <= 0) {

                end("time");
            }

        }, 1000);
    }

    function end(reason = "time", winner = null) {

        clearTimer();

        running = false;

        if (typeof stopMonsterAI === "function") {
            stopMonsterAI();
        }

        if (typeof onChaseEnded === "function") {

            onChaseEnded({
                reason,
                winner
            });
        }

        broadcastState();
    }

    function checkPlayers() {

        const players = getPlayers();

        let alivePlayers = [];

        for (const player of players.values()) {

            if (
                player.isNahroush === true
            ) {
                continue;
            }

            if (
                player.alive !== false &&
                player.caught !== true
            ) {
                alivePlayers.push(player);
            }
        }

        if (alivePlayers.length === 0) {

            end("all_caught");

            return true;
        }

        return false;
    }

    function reset() {

        clearTimer();

        running = false;
        timeLeft = 0;

        broadcastState();
    }

    return {
        getTimeLeft,
        isRunning,
        start,
        end,
        checkPlayers,
        reset,
        clearTimer
    };
}


module.exports = {
    createChaseManager
};
