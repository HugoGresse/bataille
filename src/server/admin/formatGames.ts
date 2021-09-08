import { Game } from '../Game'
import { AdminUpdate } from './types/AdminUpdate'

export const formatGames = (games: { [id: string]: Game }): AdminUpdate => {
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
