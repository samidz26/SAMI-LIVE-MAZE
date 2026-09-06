function createNahroushManager(options = {}) {

    const {
        getPlayers,
        broadcastState,
        username = "jordan_river13",
        onNahroushCaught,
        onPlayerCaught
    } = options;


    let running = false;
    let caught = false;


    function normalize(value) {

        return String(value || "")
            .trim()
            .replace(/^@/, "")
            .toLowerCase();
    }


    function isRunning() {
        return running;
    }


    function isCaught() {
        return caught;
    }


    function findNahroush() {

        const target =
            normalize(username);


        for (
            const player
            of getPlayers().values()
        ) {

            if (
                normalize(
                    player.uniqueId
                ) === target
            ) {

                return player;
            }
        }


        return null;
    }


    function start() {

        const nahroush =
            findNahroush();


        if (!nahroush) {

            return false;
        }


        running = true;
        caught = false;


        nahroush.isNahroush =
            true;

        nahroush.alive = true;
        nahroush.caught = false;


        broadcastState();

        return true;
    }


    function catchNahroush(player) {

        if (!running)
            return false;

        if (caught)
            return false;


        caught = true;
        running = false;


        if (
            typeof onNahroushCaught ===
            "function"
        ) {

            onNahroushCaught(player);
        }


        broadcastState();

        return true;
    }


    function catchPlayer(player) {

        if (!running)
            return false;


        if (!player)
            return false;


        if (player.isNahroush)
            return false;


        player.alive = false;
        player.caught = true;


        if (
            typeof onPlayerCaught ===
            "function"
        ) {

            onPlayerCaught(player);
        }


        broadcastState();

        return true;
    }


    function checkCollision(player) {

        if (!running)
            return false;


        if (!player)
            return false;


        const nahroush =
            findNahroush();


        if (!nahroush)
            return false;


        if (
            nahroush.x === player.x &&
            nahroush.y === player.y
        ) {

            if (
                player.isNahroush
            ) {

                return false;
            }


            return catchPlayer(
                player
            );
        }


        return false;
    }


    function reset() {

        running = false;

        caught = false;


        const nahroush =
            findNahroush();


        if (nahroush) {

            nahroush.isNahroush =
                false;

            nahroush.alive =
                true;

            nahroush.caught =
                false;
        }


        broadcastState();
    }


    return {

        start,

        reset,

        catchNahroush,

        catchPlayer,

        checkCollision,

        findNahroush,

        isRunning,

        isCaught
    };
}


module.exports = {
    createNahroushManager
};
