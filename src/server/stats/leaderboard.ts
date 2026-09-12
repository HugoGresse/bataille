import type { LeaderboardEntry } from '../../common/auth'
import type { GameStatEvent, StatResult } from './GameStats'

const MAX_ENTRIES = 50

type Tally = { name: string; games: number; wins: number; winsVsHumans: number }

const hasOtherHuman = (results: StatResult[], self: StatResult): boolean =>
    results.some((r) => !r.isAI && r !== self && (!r.accountId || r.accountId !== self.accountId))

/**
 * Signed-in players ranked by wins. A game alone against AIs counts as a game; wins against
 * another human are kept apart so the table says what a win was worth.
 */
export const buildLeaderboard = (events: readonly GameStatEvent[]): LeaderboardEntry[] => {
    const tallies = new Map<string, Tally>()
    for (const event of events) {
        if (event.type !== 'gameEnded' || !event.results) {
            continue
        }
        // One seat per account per game: a second seat of the same person is not a second game
        const counted = new Set<string>()
        for (const result of event.results) {
            if (result.isAI || !result.accountId || counted.has(result.accountId)) {
                continue
            }
            counted.add(result.accountId)
            const tally = tallies.get(result.accountId) ?? { name: result.name, games: 0, wins: 0, winsVsHumans: 0 }
            tally.name = result.name
            tally.games++
            if (result.won) {
                tally.wins++
                if (hasOtherHuman(event.results, result)) {
                    tally.winsVsHumans++
                }
            }
            tallies.set(result.accountId, tally)
        }
    }
    return [...tallies.entries()]
        .map(([accountId, tally]) => ({
            accountId,
            name: tally.name,
            games: tally.games,
            wins: tally.wins,
            winsVsHumans: tally.winsVsHumans,
            winRate: tally.games === 0 ? 0 : tally.wins / tally.games,
        }))
        .sort(
            (a, b) =>
                b.wins - a.wins ||
                b.winRate - a.winRate ||
                b.winsVsHumans - a.winsVsHumans ||
                a.name.localeCompare(b.name)
        )
        .slice(0, MAX_ENTRIES)
}

const CACHE_MS = 60_000

/** The fold walks every event, so callers hitting it per page view share one result a minute */
export const createLeaderboardReader = (getEvents: () => readonly GameStatEvent[], now: () => number = Date.now) => {
    let cached: { at: number; count: number; entries: LeaderboardEntry[] } | null = null
    return (): LeaderboardEntry[] => {
        const events = getEvents()
        if (cached && cached.count === events.length && now() - cached.at < CACHE_MS) {
            return cached.entries
        }
        cached = { at: now(), count: events.length, entries: buildLeaderboard(events) }
        return cached.entries
    }
}
