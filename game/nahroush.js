function createNahroushManager(options) {

    const {
        getPlayers,
        getMonsters,
        startMonsterAI,
        stopMonsterAI,
        broadcastState,
        onNahroushCaught,
        onPlayerCaught
    } = options;

    let running = false;
    let nahroushCaught = false;

    function isRunning() {
        return running;
    }

    function isCaught() {
        return nahroushCaught;
    }

    function start() {

        running = true;
        nahroushCaught = false;

        const players = getPlayers();

        for (const player of players.values()) {

            if (player.isNahroush) {

                player.alive = true;
                player.caught = false;
            }
        }

        broadcastState();
    }

    function catchNahroush(player) {

        if (!running) {
            return;
        }

        if (!player || !player.isNahroush) {
            return;
        }

        if (nahroushCaught) {
            return;
        }

        nahroushCaught = true;

        player.caught = true;
        player.alive = false;

        if (typeof stopMonsterAI === "function") {
            stopMonsterAI();
        }

        if (typeof onNahroushCaught === "function") {
            onNahroushCaught(player);
        }

        running = false;

        broadcastState();
    }

    function catchPlayer(player, monster) {

        if (!running) {
            return;
        }

        if (!player || player.isNahroush) {
            return;
        }

        if (player.caught === true) {
            return;
        }

        player.caught = true;
        player.alive = false;

        if (typeof onPlayerCaught === "function") {
            onPlayerCaught(player, monster);
        }

        broadcastState();
    }

    function checkMonsterCollision(monster) {

        if (!running) {
            return;
        }

        const players = getPlayers();

        for (const player of players.values()) {

            if (
                player.x !== monster.x ||
                player.y !== monster.y
            ) {
                continue;
            }

            if (player.isNahroush) {

                catchNahroush(player);

            } else {

                catchPlayer(player, monster);
            }
        }
    }

    function reset() {

        running = false;
        nahroushCaught = false;

        broadcastState();
    }

    return {
        isRunning,
        isCaught,
        start,
        catchNahroush,
        catchPlayer,
        checkMonsterCollision,
        reset
    };
}


module.exports = {
    createNahroushManager
};
