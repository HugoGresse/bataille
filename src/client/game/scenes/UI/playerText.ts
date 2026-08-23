import { PublicPlayerState } from '../../../../server/model/GameState'

/**
 * One-line summary of a player, for surfaces that render plain text (the admin screen).
 * The in-game standings carry the same state through the row itself instead.
 */
export const getPlayerText = (index: number, player: PublicPlayerState): string => {
    let text = `${index + 1}. ${player.n}: ${player.i} `

    if (player.d) {
        text += 'dead'
    }
    if (!player.cnt) {
        text += ' disconnected'
    }
    if (player.s) {
        text += ' surrendered'
    }

    return text.trimEnd()
}
