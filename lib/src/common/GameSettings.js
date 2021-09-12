'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.IASettings =
    exports.IA_PLAYER_PER_GAME =
    exports.MINIMUM_PLAYER_PER_GAME =
    exports.MONEY_INCOME_START =
    exports.INCOME_MS =
        void 0
exports.INCOME_MS = 7000
exports.MONEY_INCOME_START = 4
exports.MINIMUM_PLAYER_PER_GAME = process.env.MIN_PLAYER ? Number(process.env.MIN_PLAYER) : 6
exports.IA_PLAYER_PER_GAME = process.env.IA_PLAYER_PER_GAME ? Number(process.env.IA_PLAYER_PER_GAME) : 0
exports.IASettings = {
    updateInterval: 2000,
    randomMin: 500,
    randomMax: 3000,
    maxActionsByRun: 5,
}
