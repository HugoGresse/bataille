import fs from 'node:fs'
import path from 'node:path'
import { createIpHasher } from './ipHash'

export type StatPlayer = {
    name: string
    isAI: boolean
    /** Keyed hash of the address; the address itself is never written down. Absent for AIs. */
    ipHash?: string
    /** ISO 3166-1 alpha-2, when the lookup resolved one */
    country?: string
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

export type IpGameCount = {
    ipHash: string
    /** Country of that address, when known */
    country?: string
    gameCount: number
    /** Distinct human names seen from this address, which is what makes one host stand out */
    playerCount: number
}

export type IpPeriod = {
    /** YYYY-MM-DD for days, YYYY-MM for months */
    period: string
    /** Games in this period played from a known address */
    gameCount: number
    ips: IpGameCount[]
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
    /** 5. games played per client address over the whole range, busiest first */
    gamesByIp: IpGameCount[]
    /** 5a. the same split by day, most recent first */
    gamesByIpByDay: IpPeriod[]
    /** 5b. the same split by month, most recent first */
    gamesByIpByMonth: IpPeriod[]
    gameCount: number
    /**
     * Set when statistics are not reaching the disk. Events still accumulate in memory, so the
     * numbers above look healthy right up until the process restarts and they are gone: without
     * this the panel gives no hint that anything is wrong.
     */
    storageError?: string
}

const dayOf = (isoDate: string): string => isoDate.slice(0, 10)
const monthOf = (isoDate: string): string => isoDate.slice(0, 7)

/** The panel shows a table, not a log: enough rows to spot a busy host without unbounded growth */
const MAX_LISTED_IPS = 10
/** A long range would otherwise return a row per day forever */
const MAX_LISTED_DAYS = 31
const MAX_LISTED_MONTHS = 12

type IpTally = Map<string, { games: Set<string>; players: Set<string>; country?: string }>

/** Counted by game id, so several people behind one address count their shared game once */
const tallyIp = (tally: IpTally, player: StatPlayer, gameId: string) => {
    const ipHash = player.ipHash!
    const entry = tally.get(ipHash) ?? { games: new Set<string>(), players: new Set<string>() }
    entry.games.add(gameId)
    entry.players.add(player.name)
    // One address belongs to one place; the first lookup that resolved wins
    entry.country = entry.country ?? player.country
    tally.set(ipHash, entry)
}

const tallyIpIn = (periods: Map<string, IpTally>, period: string, player: StatPlayer, gameId: string) => {
    const tally = periods.get(period) ?? (new Map() as IpTally)
    tallyIp(tally, player, gameId)
    periods.set(period, tally)
}

const toIpCounts = (tally: IpTally): IpGameCount[] =>
    [...tally.entries()]
        .map(([ipHash, { games, players, country }]) => ({
            ipHash,
            country,
            gameCount: games.size,
            playerCount: players.size,
        }))
        .sort((a, b) => b.gameCount - a.gameCount || a.ipHash.localeCompare(b.ipHash))
        .slice(0, MAX_LISTED_IPS)

const toIpPeriods = (periods: Map<string, IpTally>, limit: number): IpPeriod[] =>
    [...periods.entries()]
        .map(([period, tally]) => ({
            period,
            gameCount: new Set([...tally.values()].flatMap((entry) => [...entry.games])).size,
            ips: toIpCounts(tally),
        }))
        .sort((a, b) => b.period.localeCompare(a.period))
        .slice(0, limit)

/**
 * Append-only NDJSON game statistics stored on the filesystem.
 * Events are kept in memory (loaded once at boot) and aggregated on demand for any date range.
 */
export class GameStats {
    private events: GameStatEvent[] = []
    private loadError: string | null = null
    private persistError: string | null = null

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
            this.persistError = null
        } catch (error) {
            // Only the first failure is worth logging: this runs on every game and the cause does
            // not change on its own
            if (!this.persistError) {
                console.error(`Failed to persist game stats to ${this.filePath}:`, error)
            }
            this.persistError = String(error)
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
        // + 5. games per address
        const gamesPerPlayer = new Map<string, number>()
        const playersByDay = new Map<string, Set<string>>()
        const allPlayers = new Set<string>()
        const gamesPerIp: IpTally = new Map()
        const gamesPerIpByDay = new Map<string, IpTally>()
        const gamesPerIpByMonth = new Map<string, IpTally>()
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

                if (player.ipHash) {
                    tallyIp(gamesPerIp, player, event.gameId)
                    tallyIpIn(gamesPerIpByDay, day, player, event.gameId)
                    tallyIpIn(gamesPerIpByMonth, monthOf(event.at), player, event.gameId)
                }
            }
        }

        return {
            range: { from, to },
            storageError: this.persistError ?? this.loadError ?? undefined,
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
            gamesByIp: toIpCounts(gamesPerIp),
            gamesByIpByDay: toIpPeriods(gamesPerIpByDay, MAX_LISTED_DAYS),
            gamesByIpByMonth: toIpPeriods(gamesPerIpByMonth, MAX_LISTED_MONTHS),
        }
    }

    getEventCount(): number {
        return this.events.length
    }

    getLoadError(): string | null {
        return this.loadError
    }

    /** Set once a write has failed, cleared as soon as one succeeds */
    getPersistError(): string | null {
        return this.persistError
    }
}

const statsDir = path.resolve(process.env.STATS_DIR ?? 'data')
const statsFilePath = path.join(statsDir, 'stats.ndjson')
/** Keyed with a secret kept beside the stats, so a stolen stats file reveals no addresses */
export const hashIp = createIpHasher(path.join(statsDir, 'ip-salt'))
export const gameStats = new GameStats(statsFilePath)
