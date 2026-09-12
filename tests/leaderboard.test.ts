import { describe, expect, it } from 'vitest'
import { buildLeaderboard, createLeaderboardReader } from '../src/server/stats/leaderboard'
import type { GameStatEvent, StatResult } from '../src/server/stats/GameStats'

const ended = (gameId: string, results: StatResult[]): GameStatEvent => ({
    type: 'gameEnded',
    gameId,
    at: '2026-09-01T10:00:00.000Z',
    durationMinutes: 10,
    results,
})

const human = (name: string, accountId: string | undefined, won: boolean): StatResult => ({
    name,
    isAI: false,
    ...(accountId ? { accountId } : {}),
    won,
})
const ai = (won = false): StatResult => ({ name: 'AI-1', isAI: true, won })

describe('buildLeaderboard', () => {
    it('counts a solo game against AIs as a game and a win', () => {
        const entries = buildLeaderboard([ended('g1', [human('Alice', 'a', true), ai()])])
        expect(entries).toEqual([{ accountId: 'a', name: 'Alice', games: 1, wins: 1, winsVsHumans: 0, winRate: 1 }])
    })

    it('keeps wins against another human apart', () => {
        const entries = buildLeaderboard([
            ended('g1', [human('Alice', 'a', true), human('Bob', 'b', false)]),
            ended('g2', [human('Alice', 'a', true), ai()]),
            ended('g3', [human('Alice', 'a', false), human('Bob', 'b', true)]),
        ])
        expect(entries.map((e) => [e.name, e.wins, e.winsVsHumans, e.games])).toEqual([
            ['Alice', 2, 1, 3],
            ['Bob', 1, 1, 2],
        ])
    })

    it('counts one seat per account per game and never a win against oneself', () => {
        const entries = buildLeaderboard([
            ended('g1', [human('Alice', 'a', true), human('Alice', 'a', false)]),
            ended('g2', [human('Alice', 'a', true), human('Alice', 'a', false), human('Bob', 'b', false)]),
        ])
        expect(entries.find((e) => e.name === 'Alice')).toMatchObject({ games: 2, wins: 2, winsVsHumans: 1 })
    })

    it('ignores guests, AIs and games recorded without results', () => {
        const entries = buildLeaderboard([
            ended('g1', [human('Guest', undefined, true), human('Bob', 'b', false), ai()]),
            { type: 'gameEnded', gameId: 'g0', at: '2026-01-01T00:00:00.000Z', durationMinutes: 5 },
            { type: 'gameStarted', gameId: 'g1', at: '2026-01-01T00:00:00.000Z', players: [] },
        ])
        expect(entries).toEqual([{ accountId: 'b', name: 'Bob', games: 1, wins: 0, winsVsHumans: 0, winRate: 0 }])
    })

    it('ranks by wins, then win rate', () => {
        const entries = buildLeaderboard([
            ended('g1', [human('Alice', 'a', true), human('Bob', 'b', false)]),
            ended('g2', [human('Alice', 'a', false), human('Bob', 'b', true)]),
            ended('g3', [human('Alice', 'a', false), human('Carol', 'c', true)]),
            ended('g4', [human('Bob', 'b', true), ai()]),
        ])
        expect(entries.map((e) => e.name)).toEqual(['Bob', 'Carol', 'Alice'])
    })

    it('shows the latest name an account played under', () => {
        const entries = buildLeaderboard([
            ended('g1', [human('Old', 'a', false), ai()]),
            ended('g2', [human('New', 'a', false), ai()]),
        ])
        expect(entries[0].name).toBe('New')
    })
})

describe('createLeaderboardReader', () => {
    it('recomputes when events arrive or the cache ages out', () => {
        const events: GameStatEvent[] = []
        let now = 0
        const read = createLeaderboardReader(
            () => events,
            () => now
        )
        expect(read()).toEqual([])
        events.push(ended('g1', [human('Alice', 'a', true)]))
        expect(read()).toHaveLength(1)

        const cached = read()
        events[0] = ended('g1', [human('Renamed', 'a', true)])
        expect(read()).toBe(cached)
        now = 61_000
        expect(read()[0].name).toBe('Renamed')
    })
})
