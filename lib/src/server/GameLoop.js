'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameLoop = void 0
var trackings_1 = require('./utils/trackings')
var FRAME_RATE = 10
var INTERVAL_SPEED = 1000 / FRAME_RATE
var GameLoop = /** @class */ (function () {
    function GameLoop(emitter) {
        this.emitter = emitter
        this.intervalId = null
        this.isRunning = false
        this.gameDuration = 0
        this.gameStartTS = 0
    }
    GameLoop.prototype.start = function (game) {
        var _this = this
        this.gameStartTS = Date.now()
        this.intervalId = setInterval(function () {
            var results = _this.run(game)
            if (!results) {
                _this.emitGameState(game)
            } else {
                // let users speaks at the end of the game...
                _this.gameDuration = Math.round(((Date.now() - _this.gameStartTS) / 1000 / 60) * 100) / 100
                _this.emitGameState(game)
                _this.emitter.emitMessage(results.result, results.winner)
                setTimeout(function () {
                    // Don't send 2 message at the same time = not displayed
                    _this.emitter.emitMessage('Game duration: ' + _this.gameDuration + ' minutes.')
                    console.log('> Game completed, duration: ' + _this.gameDuration + ' minutes')
                }, 1000)
                console.log(results.result)
                console.log(
                    'Humans incomes: ' +
                        game.getHumanPlayers().map(function (p) {
                            return p.income
                        })
                )
                _this.stop()
            }
        }, INTERVAL_SPEED)
        this.isRunning = true
    }
    GameLoop.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.isRunning = false
            trackings_1.trackGameEnd(this.gameDuration)
        }
    }
    GameLoop.prototype.run = function (game) {
        var endedGame = game.update()
        if (endedGame) {
            var winner = game.getWinner()
            if (!winner) {
                return {
                    result: 'No winner, all players disconnected',
                }
            }
            return {
                result: 'This game has been won by ' + winner.name,
                winner: winner,
            }
        }
        return null
    }
    GameLoop.prototype.emitGameState = function (game) {
        this.emitter.emitGameUpdate(game)
    }
    return GameLoop
})()
exports.GameLoop = GameLoop
