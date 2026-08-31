export const INCOME_MS = 7000
export const MONEY_INCOME_START = 4
export const MINIMUM_PLAYER_PER_GAME = process.env.MIN_PLAYER ? Number(process.env.MIN_PLAYER) : 6
export const IA_PLAYER_PER_GAME = process.env.IA_PLAYER_PER_GAME ? Number(process.env.IA_PLAYER_PER_GAME) : 0

/**
 * Share of the map's countries one player has to hold for the game to be called in their favour,
 * without waiting for every last opponent to be wiped out.
 */
export const DOMINATION_RATIO = 0.9

export const IASettings = {
    updateInterval: 2000,
    randomMin: 500,
    randomMax: 3000,
    maxActionsByRun: 5,
}
