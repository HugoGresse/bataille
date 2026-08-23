import { PublicPlayerState } from '../../../server/model/GameState'

export const isOutOfGame = (player: PublicPlayerState): boolean => player.d || player.s

/**
 * Live players ranked by income, eliminated ones parked at the bottom in a stable order, so the
 * list never reshuffles under the cursor.
 */
export const sortForDisplay = (players: PublicPlayerState[]): PublicPlayerState[] => {
    const alive = players.filter((player) => !isOutOfGame(player)).sort((a, b) => b.i - a.i)
    return [...alive, ...players.filter(isOutOfGame)]
}
