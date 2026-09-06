const {
    TikTokLiveConnection
} = require("tiktok-live-connector");

let connection = null;

function createConnection(username) {

    if (!username) {
        throw new Error("TikTok username is required");
    }

    connection = new TikTokLiveConnection(username);

    return connection;
}

function getConnection() {
    return connection;
}

function disconnect() {

    if (!connection) {
        return;
    }

    try {
        connection.disconnect();
    } catch (error) {
        console.error(
            "[TikTok] Disconnect error:",
            error.message
        );
    }

    connection = null;
}

module.exports = {
    createConnection,
    getConnection,
    disconnect
};
