import { Game } from './Game'
import { HumanPlayer } from './model/player/HumanPlayer'

export type Seat = { game: Game; player: HumanPlayer }
export type Games = { [gameId: string]: Game }

/** What a client is told about the seat it still holds, so it can choose to take it back or not */
export type SeatOffer = { gameId: string; playerName: string }

export const offerFor = ({ game, player }: Seat): SeatOffer => ({ gameId: game.id, playerName: player.name })

/**
 * A seat still in play somewhere. A client that asks for the lobby while it holds one is owed the
 * seat instead: it may never have received the game (dropped as it started) or be back from a crash.
 * A finished game holds no such seat: its winner asking for the lobby wants the next game, not the
 * last one replayed at them for the minute the room lingers.
 */
export const findLiveSeat = (games: Games, sessionToken: string | null): Seat | null => {
    for (const game of Object.values(games)) {
        if (game.hasEnded()) {
            continue
        }
        const player = game.findSeat(sessionToken)
        if (player && !player.isOut) {
            return { game, player }
        }
    }
    return null
}

/**
 * The seat in one named game, spectators and finished games included: what a client standing on
 * that game's page asks for. Without a game named, only a live seat qualifies.
 */
export const findSeat = (games: Games, gameId: string | undefined, sessionToken: string | null): Seat | null => {
    if (!gameId) {
        return findLiveSeat(games, sessionToken)
    }
    const game = games[gameId]
    const player = game?.findSeat(sessionToken)
    return game && player ? { game, player } : null
}
