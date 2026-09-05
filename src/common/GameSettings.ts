/**
 * Shared by the server and the browser: the browser has no `process`, so anything read from the
 * environment must go through here rather than crash the whole client at import time.
 */
const fromEnv = (name: string, fallback: number): number => {
    const raw = typeof process !== 'undefined' ? process.env[name] : undefined
    return raw ? Number(raw) : fallback
}

export const INCOME_MS = 7000
export const MONEY_INCOME_START = 4
export const MINIMUM_PLAYER_PER_GAME = fromEnv('MIN_PLAYER', 6)
export const IA_PLAYER_PER_GAME = fromEnv('IA_PLAYER_PER_GAME', 0)

/**
 * Share of the map's countries one player has to hold for the game to be called in their favour,
 * without waiting for every last opponent to be wiped out.
 */
export const DOMINATION_RATIO = 0.9

/**
 * How long a dropped player keeps their seat. Long enough to survive a Wi-Fi blip or a page reload,
 * short enough that the others are not left fighting a ghost.
 */
export const RECONNECT_GRACE_MS = 60_000

export const IASettings = {
    updateInterval: 2000,
    randomMin: 500,
    randomMax: 3000,
    maxActionsByRun: 5,
}
