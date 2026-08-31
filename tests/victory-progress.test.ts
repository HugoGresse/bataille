import { describe, expect, it } from 'vitest'
import {
    PROGRESS_REVEAL_RATIO,
    shouldShowVictoryProgress,
    victoryFraction,
} from '../src/client/game/utils/victoryProgress'

/** 90% of the map's 205 towns */
const TO_WIN = 185

describe('shouldShowVictoryProgress', () => {
    it('stays out of the way until someone is halfway to winning', () => {
        expect(PROGRESS_REVEAL_RATIO).toBe(0.5)
        expect(shouldShowVictoryProgress([40, 61, 30], TO_WIN)).toBe(false)
        expect(shouldShowVictoryProgress([40, 92, 30], TO_WIN)).toBe(false)
    })

    it('shows once the leader crosses halfway, whoever the leader is', () => {
        expect(shouldShowVictoryProgress([40, 93, 30], TO_WIN)).toBe(true)
        expect(shouldShowVictoryProgress([93], TO_WIN)).toBe(true)
    })

    it('draws nothing when there is no target to measure against', () => {
        expect(shouldShowVictoryProgress([120], 0)).toBe(false)
        expect(shouldShowVictoryProgress([], TO_WIN)).toBe(false)
    })
})

describe('victoryFraction', () => {
    it('fills in proportion to the bar, not to the map', () => {
        expect(victoryFraction(0, TO_WIN)).toBe(0)
        expect(victoryFraction(93, TO_WIN)).toBeCloseTo(0.5027, 3)
        expect(victoryFraction(185, TO_WIN)).toBe(1)
    })

    it('clamps, so an overshoot cannot spill out of its row', () => {
        expect(victoryFraction(205, TO_WIN)).toBe(1)
        expect(victoryFraction(-3, TO_WIN)).toBe(0)
        expect(victoryFraction(50, 0)).toBe(0)
    })
})
