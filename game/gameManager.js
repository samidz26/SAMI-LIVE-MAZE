function createGameManager(options) {

    const {
        getGameState,
        setGameState,
        createMaze,
        getPlayers,
        clearPlayers,
        broadcastState,
        onGameStarted,
        onGameEnded,
        onReset,
        onTreasureStart,
        onChaseStart,
        onNahroushStart
    } = options;

    let roundTimer = null;
    let roundTimeLeft = 0;

    function getRoundTimeLeft() {
        return roundTimeLeft;
    }

    function clearRoundTimer() {

        if (roundTimer) {
            clearInterval(roundTimer);
            roundTimer = null;
        }
    }

    function startRoundTimer(duration) {

        clearRoundTimer();

        roundTimeLeft = duration;

        roundTimer = setInterval(() => {

            roundTimeLeft--;

            broadcastState();

            if (roundTimeLeft <= 0) {

                clearRoundTimer();

                endGame("time");
            }

        }, 1000);
    }

    function startGame() {

        const state = getGameState();

        if (state.gameStarted) {
            return false;
        }

        const players = getPlayers();

        if (players.size === 0) {
            return false;
        }

        clearRoundTimer();

        const maze = createMaze();

        setGameState({
            gameStarted: true,
            registrationOpen: false,
            gameWinner: null,
            gameResult: null,
            maze
        });

        const updatedState = getGameState();

        if (updatedState.gameMode === "treasure") {

            if (typeof onTreasureStart === "function") {
                onTreasureStart();
            }

        } else if (updatedState.gameMode === "chase") {

            if (typeof onChaseStart === "function") {
                onChaseStart();
            }

        } else if (updatedState.gameMode === "nahroush") {

            if (typeof onNahroushStart === "function") {
                onNahroushStart();
            }
        }

        if (typeof onGameStarted === "function") {
            onGameStarted(updatedState);
        }

        broadcastState();

        return true;
    }

    function endGame(reason = "unknown", winner = null) {

        clearRoundTimer();

        const state = getGameState();

        setGameState({
            gameStarted: false,
            registrationOpen: false,
            gameWinner: winner,
            gameResult: reason
        });

        if (typeof onGameEnded === "function") {

            onGameEnded({
                reason,
                winner
            });
        }

        broadcastState();
    }

    function resetGame() {

        clearRoundTimer();

        clearPlayers();

        roundTimeLeft = 0;

        setGameState({
            gameStarted: false,
            registrationOpen: true,
            gameWinner: null,
            gameResult: null,
            maze: [],
            treasure: null,
            monsters: []
        });

        if (typeof onReset === "function") {
            onReset();
        }

        broadcastState();
    }

    return {
        getRoundTimeLeft,
        startRoundTimer,
        clearRoundTimer,
        startGame,
        endGame,
        resetGame
    };
}


module.exports = {
    createGameManager
};
