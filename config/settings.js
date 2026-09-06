module.exports = {

    server: {
        port: process.env.PORT || 3000
    },

    maze: {
        size: 12
    },

    players: {
        maxPlayers: 20,
        joinKeyword: "JOIN"
    },

    game: {
        defaultMode: "treasure",
        roundDuration: 60
    },

    treasure: {
        duration: 10
    },

    monsters: {
        count: 1,
        speed: 1000
    },

    nahroush: {
        username: "jordan_river13"
    }

};
