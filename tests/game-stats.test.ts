import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { GameStats } from '../src/server/stats/GameStats'

let tempDir: string

const at = (day: string, hour = 12): Date => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`)

beforeEach(() => {
    vi.restoreAllMocks()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bataille-stats-'))
})

describe('GameStats', () => {
    it('records and reloads events from disk', () => {
        const filePath = path.join(tempDir, 'stats.ndjson')
        const store = new GameStats(filePath)
        store.recordGameStart('g1', [{ name: 'Hugo', isAI: false }, { name: 'AI-1', isAI: true }], at('2025-08-20'))
        store.recordGameEnd('g1', 12.5, at('2025-08-21'))

        const reloaded = new GameStats(filePath)
        expect(reloaded.getEventCount()).toBe(2)
        const summary = reloaded.getStats({ from: '2025-01-01', to: '2025-12-31' })
        expect(summary.gameDurationByDay).toEqual([{ day: '2025-08-21', totalMinutes: 12.5, gameCount: 1 }])
    })

    it('sums game duration by day', () => {
        const store = new GameStats(path.join(tempDir, 'stats.ndjson'))
        store.recordGameStart('g1', [], at('2025-08-20'))
        store.recordGameStart('g2', [], at('2025-08-20'))
        store.recordGameStart('g3', [], at('2025-08-22'))
        store.recordGameEnd('g1', 10, at('2025-08-20'))
        store.recordGameEnd('g2', 5.5, at('2025-08-20'))
        store.recordGameEnd('g3', 30, at('2025-08-22'))

        const summary = store.getStats({ from: '2025-08-01', to: '2025-08-31' })
        expect(summary.gameDurationByDay).toEqual([
            { day: '2025-08-20', totalMinutes: 15.5, gameCount: 2 },
            { day: '2025-08-22', totalMinutes: 30, gameCount: 1 },
        ])
        expect(summary.gameCount).toBe(3)
    })

    it('computes top players, total player count and humans by day (AIs excluded)', () => {
        const store = new GameStats(path.join(tempDir, 'stats.ndjson'))
        const humans = [{ name: 'Hugo', isAI: false }, { name: 'Alice', isAI: false }]
        const withAI = [...humans, { name: 'AI-1', isAI: true }]

        store.recordGameStart('g1', withAI, at('2025-08-20'))
        store.recordGameStart('g2', withAI, at('2025-08-20'))
        store.recordGameStart('g3', [{ name: 'Hugo', isAI: false }], at('2025-08-21'))
        store.recordGameStart('g4', [{ name: 'Bob', isAI: false }], at('2025-08-25'))

        const summary = store.getStats({ from: '2025-08-01', to: '2025-08-31' })
        expect(summary.totalPlayerCount).toBe(3) // Hugo, Alice, Bob — AI excluded
        expect(summary.topPlayers[0]).toEqual({ name: 'Hugo', gameCount: 3 }) // g1, g2, g3
        expect(summary.topPlayers.find((p) => p.name === 'AI-1')).toBeUndefined()
        expect(summary.humanPlayersByDay).toEqual([
            { day: '2025-08-20', value: 2 },
            { day: '2025-08-21', value: 1 },
            { day: '2025-08-25', value: 1 },
        ])
    })

    it('filters by time range inclusively', () => {
        const store = new GameStats(path.join(tempDir, 'stats.ndjson'))
        store.recordGameStart('g1', [{ name: 'Hugo', isAI: false }], at('2025-08-01'))
        store.recordGameStart('g2', [{ name: 'Hugo', isAI: false }], at('2025-08-15'))
        store.recordGameStart('g3', [{ name: 'Alice', isAI: false }], at('2025-08-31', 20))
        store.recordGameStart('g4', [{ name: 'Hugo', isAI: false }], at('2025-09-01'))
        store.recordGameEnd('g1', 10, at('2025-08-01'))
        store.recordGameEnd('g2', 20, at('2025-08-15'))
        store.recordGameEnd('g3', 40, at('2025-08-31', 23))
        store.recordGameEnd('g4', 999, at('2025-09-01'))

        const summary = store.getStats({ from: '2025-08-01', to: '2025-08-31' })
        expect(summary.gameCount).toBe(3)
        expect(summary.totalPlayerCount).toBe(2)
        // g4 started AND ended outside the range
        expect(summary.gameDurationByDay.reduce((acc, d) => acc + d.totalMinutes, 0)).toBe(70)
    })
})
