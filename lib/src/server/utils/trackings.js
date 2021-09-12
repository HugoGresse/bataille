'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.trackGameEnd = exports.trackGameStart = void 0
const node_fetch_1 = __importDefault(require('node-fetch'))
const collector = process.env.SUMOLOGIC_COLLECTOR
console.log(collector)
const trackGameStart = (players) => {
    if (!collector) {
        console.warn('No sumologic collector')
        return
    }
    node_fetch_1.default(collector, {
        method: 'POST',
        body: JSON.stringify({
            gameStarted: {
                players,
            },
        }),
    })
}
exports.trackGameStart = trackGameStart
const trackGameEnd = (duration) => {
    if (!collector) {
        return
    }
    node_fetch_1.default(collector, {
        method: 'POST',
        body: JSON.stringify({
            gameEnded: { duration },
        }),
    })
}
exports.trackGameEnd = trackGameEnd
