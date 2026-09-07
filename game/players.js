const players = new Map();


function getPlayers() {
    return players;
}


function getPlayersArray() {
    return Array.from(players.values()).map(player => ({
        uniqueId:
            player.uniqueId,

        nickname:
            player.nickname,

        profilePictureUrl:
            player.profilePictureUrl,

        x:
            player.x,

        y:
            player.y,

        alive:
            player.alive !== false,

        caught:
            player.caught === true
    }));
}


function hasPlayer(uniqueId) {
    return players.has(uniqueId);
}


function getPlayer(uniqueId) {
    return players.get(uniqueId);
}


function addPlayer(uniqueId, playerData) {
    players.set(
        uniqueId,
        playerData
    );
}


function removePlayer(uniqueId) {
    players.delete(uniqueId);
}


function clearPlayers() {
    players.clear();
}


function getPlayerCount() {
    return players.size;
}


/* =====================================================
   REGISTER PLAYER
===================================================== */

function registerPlayer(user, options) {

    const {
        gameStarted,
        registrationOpen,
        maxPlayers,
        avatarCache,
        io,
        broadcastState
    } = options;


    /* ================================================
       GAME ALREADY STARTED
    ================================================ */

    if (gameStarted) {
        return;
    }


    /* ================================================
       REGISTRATION CLOSED
    ================================================ */

    if (!registrationOpen) {
        return;
    }


    /* ================================================
       INVALID USER
    ================================================ */

    if (
        !user ||
        !user.uniqueId
    ) {
        return;
    }


    /* ================================================
       PLAYER ALREADY REGISTERED
    ================================================ */

    if (
        players.has(
            user.uniqueId
        )
    ) {
        return;
    }


    /* ================================================
       MAX PLAYERS
    ================================================ */

    if (
        players.size >= maxPlayers
    ) {

        io.emit(
            "registration_full",
            {
                message:
                    "اكتمل عدد اللاعبين"
            }
        );

        return;
    }


    /* ================================================
       ADD PLAYER
    ================================================ */

    players.set(
        user.uniqueId,
        {
            uniqueId:
                user.uniqueId,

            nickname:
                user.nickname ||
                "مستخدم",

            profilePictureUrl:
                user.profilePictureUrl ||
                avatarCache.get(
                    user.uniqueId
                ) ||
                "",

            x: null,

            y: null,

            alive: true,

            caught: false
        }
    );


    /* ================================================
       LOG
    ================================================ */

    console.log(
        `[JOIN] ${user.uniqueId}`
    );


    /* ================================================
       NOTIFY CLIENTS
    ================================================ */

    io.emit(
        "player_joined",
        {
            uniqueId:
                user.uniqueId,

            nickname:
                user.nickname,

            profilePictureUrl:
                user.profilePictureUrl
        }
    );


    /* ================================================
       UPDATE GAME STATE
    ================================================ */

    broadcastState();
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {

    getPlayers,

    getPlayersArray,

    hasPlayer,

    getPlayer,

    addPlayer,

    removePlayer,

    clearPlayers,

    getPlayerCount,

    registerPlayer
};
