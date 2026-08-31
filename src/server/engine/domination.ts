import { DOMINATION_RATIO } from '../../common/GameSettings'

/** Everything the rule needs off a player, so it can be exercised without a whole game around it */
export type DominationCandidate = {
    isDead: boolean
    isConnected: boolean
    townCount: number
}

/**
 * Towns one player has to hold for the map to count as theirs. Rounded up, so the bar is never
 * softer than the ratio reads.
 */
export const townsToWin = (totalTowns: number): number => Math.ceil(totalTowns * DOMINATION_RATIO)

/**
 * The player who has taken enough of the map to end the game there and then.
 *
 * The last holdouts are usually islands and leftovers that cost far more time than they decide, so
 * the game is called once somebody is that far ahead instead of making everyone mop up. The rule
 * reads on whoever gets there, AI included: a hopeless game deserves to end as promptly as a won
 * one.
 *
 * Towns rather than countries, even though countries are what income is paid on. A country only
 * counts for you once you hold every town in it, so on this map a survivor denies you six countries
 * by keeping six towns, one in each - 3% of the board, and the rule would never fire in exactly the
 * mop-up it exists to end. Denying the same share of towns takes 21 of them, genuinely held.
 */
export const findDominantPlayer = <T extends DominationCandidate>(players: T[], totalTowns: number): T | null => {
    if (totalTowns <= 0) {
        return null
    }
    const target = townsToWin(totalTowns)
    return players.find((player) => !player.isDead && player.isConnected && player.townCount >= target) ?? null
}
