'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.formatGames = void 0
const formatGames = (games) => {
    return {
        games: Object.keys(games).map((gameId) => {
            const game = games[gameId]
            const duration = Math.round(((Date.now() - game.getGameStartTime()) / 1000 / 60) * 100) / 100
            return {
                id: gameId,
                duration,
                players: game.getState().players,
            }
        }),
    }
}
exports.formatGames = formatGames
