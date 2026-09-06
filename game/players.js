const players = new Map();

function getPlayers() {
    return players;
}

function getPlayersArray() {
    return Array.from(players.values()).map(player => ({
        uniqueId: player.uniqueId,
        nickname: player.nickname,
        profilePictureUrl: player.profilePictureUrl,
        x: player.x,
        y: player.y,
        alive: player.alive !== false,
        caught: player.caught === true,
        isNahroush: player.isNahroush === true
    }));
}

function hasPlayer(uniqueId) {
    return players.has(uniqueId);
}

function getPlayer(uniqueId) {
    return players.get(uniqueId);
}

function addPlayer(uniqueId, playerData) {
    players.set(uniqueId, playerData);
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
        nahroushUsername,
        avatarCache,
        io,
        broadcastState
    } = options;


    if (gameStarted) {
        return;
    }

    if (!registrationOpen) {
        return;
    }

    if (
        !user ||
        !user.uniqueId
    ) {
        return;
    }

    if (
        players.has(
            user.uniqueId
        )
    ) {
        return;
    }

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


    const normalizedUser =
        String(
            user.uniqueId
        )
        .trim()
        .toLowerCase();


    const normalizedNahroush =
        String(
            nahroushUsername || ""
        )
        .trim()
        .replace(/^@/, "")
        .toLowerCase();


    const isNahroush =
        normalizedUser ===
        normalizedNahroush;


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

            caught: false,

            isNahroush
        }
    );


    console.log(
        `[JOIN] ${user.uniqueId}` +
        (
            isNahroush
                ? " -> NAHROUSH"
                : ""
        )
    );


    io.emit(
        "player_joined",
        {
            uniqueId:
                user.uniqueId,

            nickname:
                user.nickname,

            profilePictureUrl:
                user.profilePictureUrl,

            isNahroush
        }
    );


    broadcastState();
}


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
