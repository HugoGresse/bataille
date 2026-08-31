import { describe, expect, it } from 'vitest'
import { moveAmountFor } from '../src/client/game/utils/moveAmount'
import { MUSTER_OPTIONS, musterCount } from '../src/client/game/utils/muster'
import { sampleWave } from '../src/client/game/utils/waveCurve'
import { isOutOfGame, sortForDisplay } from '../src/client/game/utils/standingsOrder'
import { isSameColor, toColorNumber, toCssColor } from '../src/client/game/utils/colors'
import { feedLine, laneFor, stamp, victoryAnnouncement } from '../src/client/game/scenes/UI/notices'
import { hudFont, hudPx } from '../src/client/game/scenes/UI/hudScale'
import { PublicPlayerState } from '../src/server/model/GameState'
import { Message } from '../src/server/model/types/Message'

const player = (name: string, income: number, extra: Partial<PublicPlayerState> = {}): PublicPlayerState => ({
    n: name,
    i: income,
    c: '0xFF0000',
    ctr: [],
    tw: 0,
    cnt: true,
    d: false,
    s: false,
    ...extra,
})

const message = (content: string, from?: string, isUserMessage = false): Message => ({
    content,
    player: from ? player(from, 0) : null,
    isUserMessage,
})

describe('moveAmountFor', () => {
    it('sends the whole stack by default', () => {
        expect(moveAmountFor(11)).toBe(11)
        expect(moveAmountFor(11, {})).toBe(11)
    })

    it('sends half on shift, rounded down, never below one', () => {
        expect(moveAmountFor(11, { shiftKey: true })).toBe(5)
        expect(moveAmountFor(2, { shiftKey: true })).toBe(1)
        expect(moveAmountFor(1, { shiftKey: true })).toBe(1)
    })

    it('sends a single unit on alt, which wins over shift', () => {
        expect(moveAmountFor(11, { altKey: true })).toBe(1)
        expect(moveAmountFor(11, { altKey: true, shiftKey: true })).toBe(1)
    })
})

describe('musterCount', () => {
    const option = (key: string) => MUSTER_OPTIONS.find((o) => o.key === key)!

    it('raises the whole pack when the treasury covers it', () => {
        expect(musterCount(option('R'), 100)).toBe(1)
        expect(musterCount(option('T'), 100)).toBe(10)
        expect(musterCount(option('T'), 10)).toBe(10)
    })

    it('shrinks a pack to what is left rather than refusing it', () => {
        expect(musterCount(option('T'), 4)).toBe(4)
        expect(musterCount(option('T'), 1)).toBe(1)
    })

    it('spends the whole treasury on +all', () => {
        expect(musterCount(option('Y'), 137)).toBe(137)
        expect(musterCount(option('Y'), 0)).toBe(0)
    })

    it('raises nothing when the treasury is empty', () => {
        expect(musterCount(option('R'), 0)).toBe(0)
        expect(musterCount(option('T'), 0)).toBe(0)
        expect(musterCount(option('T'), -5)).toBe(0)
    })
})

describe('sampleWave', () => {
    it('travels the whole way out while fading to nothing', () => {
        expect(sampleWave(0).scale).toBeCloseTo(0.34)
        expect(sampleWave(1).scale).toBeCloseTo(3.4)
        expect(sampleWave(1).alpha).toBe(0)
    })

    it('keeps moving through its whole life instead of popping and hanging', () => {
        const scales = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => sampleWave(t).scale)
        for (let i = 1; i < scales.length; i++) {
            expect(scales[i]).toBeGreaterThan(scales[i - 1])
        }
        // no single fifth of the animation covers more than half the distance
        const travel = scales.slice(1).map((s, i) => s - scales[i])
        const total = scales[scales.length - 1] - scales[0]
        travel.forEach((step) => expect(step).toBeLessThan(total * 0.5))
    })

    it('fades and thins monotonically', () => {
        const steps = [0, 0.25, 0.5, 0.75, 1].map(sampleWave)
        for (let i = 1; i < steps.length; i++) {
            expect(steps[i].alpha).toBeLessThan(steps[i - 1].alpha)
            expect(steps[i].width).toBeLessThan(steps[i - 1].width)
        }
    })

    it('clamps out of range progress', () => {
        expect(sampleWave(-1)).toEqual(sampleWave(0))
        expect(sampleWave(2)).toEqual(sampleWave(1))
    })
})

describe('standings order', () => {
    it('ranks live players by income', () => {
        const ordered = sortForDisplay([player('A', 10), player('B', 40), player('C', 25)])
        expect(ordered.map((p) => p.n)).toEqual(['B', 'C', 'A'])
    })

    it('parks eliminated and surrendered players at the bottom, in their original order', () => {
        const ordered = sortForDisplay([
            player('Dead', 0, { d: true }),
            player('A', 10),
            player('Gone', 5, { s: true }),
            player('B', 40),
        ])
        expect(ordered.map((p) => p.n)).toEqual(['B', 'A', 'Dead', 'Gone'])
    })

    it('treats a disconnected but living player as still in the running', () => {
        expect(isOutOfGame(player('A', 10, { cnt: false }))).toBe(false)
        expect(isOutOfGame(player('A', 10, { d: true }))).toBe(true)
    })
})

describe('colors', () => {
    it('reads both notations', () => {
        expect(toColorNumber('0xFF5252')).toBe(0xff5252)
        expect(toColorNumber('#ff5252')).toBe(0xff5252)
        expect(toCssColor('0xFF5252')).toBe('#FF5252')
    })

    it('falls back rather than producing NaN', () => {
        expect(toColorNumber(undefined, 0x123456)).toBe(0x123456)
        expect(toColorNumber('nonsense', 0x123456)).toBe(0x123456)
    })

    it('compares across notations', () => {
        expect(isSameColor('0xFF5252', '#ff5252')).toBe(true)
        expect(isSameColor('0xFF5252', '#00ff00')).toBe(false)
        expect(isSameColor(undefined, '#ff5252')).toBe(false)
    })
})

describe('notice lanes', () => {
    const me = 'Fili'

    it('puts chat in the middle', () => {
        expect(laneFor(message('hello', 'AI-1', true), me)).toBe('centre')
    })

    it('puts my own country captures in the middle and everyone else in the feed', () => {
        expect(laneFor(message('France (+5) was captured by Fili', me), me)).toBe('centre')
        expect(laneFor(message('France (+5) was captured by AI-2', 'AI-2'), me)).toBe('feed')
    })

    it('puts eliminations in the middle whoever they are, and disconnects in the feed', () => {
        expect(laneFor(message('Player is dead: AI-2', 'AI-2'), me)).toBe('centre')
        expect(laneFor(message('Player disconnected: AI-2', 'AI-2'), me)).toBe('feed')
    })

    it('rewrites a capture for the narrow feed', () => {
        expect(feedLine(message('France (+5) was captured by AI-2', 'AI-2'))).toEqual({
            actor: 'AI-2',
            text: 'took France (+5)',
        })
    })

    it('stamps elapsed game time', () => {
        expect(stamp(0)).toBe('00:00')
        expect(stamp(65_000)).toBe('01:05')
        expect(stamp(-5)).toBe('00:00')
    })
})

describe('victory notices', () => {
    const won = (content: string) => message(content)

    it('routes the end of the game to its own lane, whoever won', () => {
        expect(laneFor(won('This game has been won by Gimli, holding 185 of the 205 towns'), 'Frodo')).toBe('victory')
        expect(laneFor(won('This game has been won by Frodo'), 'Frodo')).toBe('victory')
        expect(laneFor(won('No winner, all players disconnected'), 'Frodo')).toBe('victory')
    })

    it('splits the announcement into a headline and its reason', () => {
        expect(victoryAnnouncement('This game has been won by Gimli, holding 185 of the 205 towns', 'Frodo')).toEqual({
            title: 'Gimli',
            detail: 'holding 185 of the 205 towns',
            mine: false,
        })
    })

    it('names the reader rather than repeating their own name back at them', () => {
        expect(victoryAnnouncement('This game has been won by Frodo, holding 190 of the 205 towns', 'Frodo')).toEqual({
            title: 'VICTORY',
            detail: 'holding 190 of the 205 towns',
            mine: true,
        })
    })

    it('handles a win with no reason attached, and an abandoned game', () => {
        expect(victoryAnnouncement('This game has been won by Gimli', 'Frodo')).toEqual({
            title: 'Gimli',
            detail: '',
            mine: false,
        })
        expect(victoryAnnouncement('No winner, all players disconnected', 'Frodo')).toEqual({
            title: 'NO WINNER',
            detail: 'all players disconnected',
            mine: false,
        })
    })

    it('leaves anything that is not an ending alone', () => {
        expect(victoryAnnouncement('France (+5) was captured by Gimli', 'Frodo')).toBeNull()
    })
})

describe('hud scale', () => {
    it('grows the HUD by half again, on whole pixels', () => {
        expect(hudPx(20)).toBe(30)
        expect(hudPx(9)).toBe(14)
        expect(hudFont(13)).toBe('20px')
    })
})
