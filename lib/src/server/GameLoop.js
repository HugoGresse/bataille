'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameLoop = void 0
const trackings_1 = require('./utils/trackings')
const FRAME_RATE = 10
const INTERVAL_SPEED = 1000 / FRAME_RATE
class GameLoop {
    constructor(emitter) {
        this.emitter = emitter
        this.intervalId = null
        this.isRunning = false
        this.gameDuration = 0
        this.gameStartTS = 0
    }
    start(game) {
        this.gameStartTS = Date.now()
        this.intervalId = setInterval(() => {
            const results = this.run(game)
            if (!results) {
                this.emitGameState(game)
            } else {
                // let users speaks at the end of the game...
                this.gameDuration = Math.round(((Date.now() - this.gameStartTS) / 1000 / 60) * 100) / 100
                this.emitGameState(game)
                this.emitter.emitMessage(results.result, results.winner)
                setTimeout(() => {
                    // Don't send 2 message at the same time = not displayed
                    this.emitter.emitMessage(`Game duration: ${this.gameDuration} minutes.`)
                    console.log(`> Game completed, duration: ${this.gameDuration} minutes`)
                }, 1000)
                console.log(results.result)
                console.log(`Humans incomes: ${game.getHumanPlayers().map((p) => p.income)}`)
                this.stop()
            }
        }, INTERVAL_SPEED)
        this.isRunning = true
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.isRunning = false
            trackings_1.trackGameEnd(this.gameDuration)
        }
    }
    run(game) {
        const endedGame = game.update()
        if (endedGame) {
            const winner = game.getWinner()
            if (!winner) {
                return {
                    result: 'No winner, all players disconnected',
                }
            }
            return {
                result: `This game has been won by ${winner.name}`,
                winner: winner,
            }
        }
        return null
    }
    emitGameState(game) {
        this.emitter.emitGameUpdate(game)
    }
}
exports.GameLoop = GameLoop
