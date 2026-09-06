const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const SETTINGS = require("./config/settings");
const { createGameManager } = require("./game/gameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = SETTINGS.server.port;

app.use(express.static(__dirname + "/public"));

const gameManager = createGameManager({
    io,
    settings: SETTINGS
});

gameManager.registerSocketEvents();

server.listen(PORT, () => {
    console.log(
        `SAMI LIVE Maze running on port ${PORT}`
    );
});
