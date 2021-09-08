'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.formatGames = void 0
var formatGames = function (games) {
    return {
        games: Object.keys(games).map(function (gameId) {
            var game = games[gameId]
            var duration = Math.round(((Date.now() - game.getGameStartTime()) / 1000 / 60) * 100) / 100
            return {
                id: gameId,
                duration: duration,
                players: game.getState().players,
            }
        }),
    }
}
exports.formatGames = formatGames
