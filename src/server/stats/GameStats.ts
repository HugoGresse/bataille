import fs from 'node:fs'
import path from 'node:path'

export type StatPlayer = {
    name: string
    isAI: boolean
}

export type GameStatEvent = {
    type: 'gameStarted' | 'gameEnded'
    gameId: string
    /** ISO timestamp */
    at: string
    /** gameStarted only */
    players?: StatPlayer[]
    /** gameEnded only */
    durationMinutes?: number
}

export type DayValue = {
    day: string // YYYY-MM-DD
    value: number
}

export type DurationByDay = {
    day: string
    totalMinutes: number
    gameCount: number
}

export type PlayerGameCount = {
    name: string
    gameCount: number
}

export type GameStatsRange = {
    from: string // YYYY-MM-DD (inclusive)
    to: string // YYYY-MM-DD (inclusive)
}

export type GameStatsSummary = {
    range: GameStatsRange
    /** 1. sum of game duration by day */
    gameDurationByDay: DurationByDay[]
    /** 2. top players by number of games played (humans only) */
    topPlayers: PlayerGameCount[]
    /** 3. total distinct human players in range */
    totalPlayerCount: number
    /** 4. number of distinct human players by day */
    humanPlayersByDay: DayValue[]
    gameCount: number
}

const dayOf = (isoDate: string): string => isoDate.slice(0, 10)

/**
 * Append-only NDJSON game statistics stored on the filesystem.
 * Events are kept in memory (loaded once at boot) and aggregated on demand for any date range.
 */
export class GameStats {
    private events: GameStatEvent[] = []
    private loadError: string | null = null

    constructor(private readonly filePath: string) {
        this.load()
    }

    private load() {
        try {
            if (!fs.existsSync(this.filePath)) {
                return
            }
            const content = fs.readFileSync(this.filePath, 'utf8')
            for (const line of content.split('\n')) {
                if (!line.trim()) {
                    continue
                }
                try {
                    const event = JSON.parse(line) as GameStatEvent
                    if ((event.type === 'gameStarted' || event.type === 'gameEnded') && event.gameId && event.at) {
                        this.events.push(event)
                    }
                } catch {
                    // tolerate a partially written last line
                }
            }
        } catch (error) {
            this.loadError = String(error)
            console.error('Failed to load game stats:', error)
        }
    }

    recordGameStart(gameId: string, players: StatPlayer[], at: Date = new Date()) {
        this.record({
            type: 'gameStarted',
            gameId,
            at: at.toISOString(),
            players,
        })
    }

    recordGameEnd(gameId: string, durationMinutes: number, at: Date = new Date()) {
        this.record({
            type: 'gameEnded',
            gameId,
            at: at.toISOString(),
            durationMinutes,
        })
    }

    private record(event: GameStatEvent) {
        this.events.push(event)
        try {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
            fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`)
        } catch (error) {
            console.error('Failed to persist game stat event:', error)
        }
    }

    getStats(range: GameStatsRange): GameStatsSummary {
        const from = range.from.slice(0, 10)
        const to = range.to.slice(0, 10)

        const startedInRange = this.events.filter(
            (event) => event.type === 'gameStarted' && dayOf(event.at) >= from && dayOf(event.at) <= to
        )
        const endedInRange = this.events.filter(
            (event) => event.type === 'gameEnded' && dayOf(event.at) >= from && dayOf(event.at) <= to
        )

        // 1. Sum of game duration by day
        const durationByDay = new Map<string, { totalMinutes: number; gameCount: number }>()
        for (const event of endedInRange) {
            const day = dayOf(event.at)
            const entry = durationByDay.get(day) ?? { totalMinutes: 0, gameCount: 0 }
            entry.totalMinutes += event.durationMinutes ?? 0
            entry.gameCount++
            durationByDay.set(day, entry)
        }

        // 2. Top players game count (humans only) + 3. total distinct players + 4. humans by day
        const gamesPerPlayer = new Map<string, number>()
        const playersByDay = new Map<string, Set<string>>()
        const allPlayers = new Set<string>()
        for (const event of startedInRange) {
            const day = dayOf(event.at)
            for (const player of event.players ?? []) {
                if (player.isAI) {
                    continue
                }
                gamesPerPlayer.set(player.name, (gamesPerPlayer.get(player.name) ?? 0) + 1)
                const dayPlayers = playersByDay.get(day) ?? new Set<string>()
                dayPlayers.add(player.name)
                playersByDay.set(day, dayPlayers)
                allPlayers.add(player.name)
            }
        }

        return {
            range: { from, to },
            gameCount: startedInRange.length,
            gameDurationByDay: [...durationByDay.entries()]
                .map(([day, { totalMinutes, gameCount }]) => ({ day, totalMinutes, gameCount }))
                .sort((a, b) => a.day.localeCompare(b.day)),
            topPlayers: [...gamesPerPlayer.entries()]
                .map(([name, gameCount]) => ({ name, gameCount }))
                .sort((a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name))
                .slice(0, 10),
            totalPlayerCount: allPlayers.size,
            humanPlayersByDay: [...playersByDay.entries()]
                .map(([day, players]) => ({ day, value: players.size }))
                .sort((a, b) => a.day.localeCompare(b.day)),
        }
    }

    getEventCount(): number {
        return this.events.length
    }

    getLoadError(): string | null {
        return this.loadError
    }
}

const statsFilePath = path.resolve(process.env.STATS_DIR ?? 'data', 'stats.ndjson')
export const gameStats = new GameStats(statsFilePath)
