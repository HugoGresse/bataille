import { describe, expect, it } from 'vitest'
import { DominationCandidate, findDominantPlayer, townsToWin } from '../src/server/engine/domination'
import { DOMINATION_RATIO } from '../src/common/GameSettings'

const player = (townCount: number, extra: Partial<DominationCandidate> = {}): DominationCandidate => ({
    isDead: false,
    isConnected: true,
    townCount,
    ...extra,
})

/** What the shipped map actually holds, so the numbers below are the ones players will meet */
const MAP_TOWNS = 205

describe('townsToWin', () => {
    it('rounds up, so the bar is never softer than the ratio', () => {
        expect(DOMINATION_RATIO).toBe(0.9)
        expect(townsToWin(MAP_TOWNS)).toBe(185) // 184.5
        expect(townsToWin(10)).toBe(9)
        expect(townsToWin(3)).toBe(3) // 2.7
        expect(townsToWin(1)).toBe(1)
    })
})

describe('findDominantPlayer', () => {
    it('calls the game for whoever crosses the bar', () => {
        const leader = player(185)
        expect(findDominantPlayer([player(9), leader, player(11)], MAP_TOWNS)).toBe(leader)
    })

    it('leaves a game running one town short of the bar', () => {
        expect(findDominantPlayer([player(184), player(21)], MAP_TOWNS)).toBeNull()
    })

    it('cannot be denied by a token holdout, which is why it counts towns', () => {
        // six towns, one per country, would keep the same player off 90% of the countries forever
        expect(findDominantPlayer([player(199), player(6)], MAP_TOWNS)).not.toBeNull()
    })

    it('reads on the AI too: a hopeless game ends as promptly as a won one', () => {
        // nothing here distinguishes an AI, which is the point: the rule is the same for everyone
        const ai = player(185)
        expect(findDominantPlayer([player(4), ai], MAP_TOWNS)).toBe(ai)
    })

    it('never hands the map to a player who is out of it', () => {
        expect(findDominantPlayer([player(185, { isDead: true })], MAP_TOWNS)).toBeNull()
        expect(findDominantPlayer([player(185, { isConnected: false })], MAP_TOWNS)).toBeNull()
    })

    it('holds its tongue when the map has no towns to count', () => {
        expect(findDominantPlayer([player(0)], 0)).toBeNull()
        expect(findDominantPlayer([player(0)], -1)).toBeNull()
    })

    it('takes the whole map as domination, and an empty hand as not', () => {
        expect(findDominantPlayer([player(MAP_TOWNS)], MAP_TOWNS)).not.toBeNull()
        expect(findDominantPlayer([player(0)], MAP_TOWNS)).toBeNull()
    })
})
