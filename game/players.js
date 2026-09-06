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

module.exports = {
    getPlayers,
    getPlayersArray,
    hasPlayer,
    getPlayer,
    addPlayer,
    removePlayer,
    clearPlayers,
    getPlayerCount
};
