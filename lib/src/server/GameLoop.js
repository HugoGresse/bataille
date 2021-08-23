'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameLoop = void 0
var FRAME_RATE = 20
var INTERVAL_SPEED = 1000 / FRAME_RATE
var GameLoop = /** @class */ (function () {
    function GameLoop(emitter) {
        this.emitter = emitter
        this.intervalId = null
        this.isRunning = false
    }
    GameLoop.prototype.start = function (game, onGameEnded) {
        var _this = this
        console.log('Loop started')
        var startTime = Date.now()
        this.intervalId = setInterval(function () {
            var _a
            var results = _this.run(game)
            if (!results) {
                _this.emitGameState(game)
            } else {
                _this.emitGameState(game)
                var gameDurationMinutes_1 = (Date.now() - startTime) / 1000 / 60
                _this.emitter.emitMessage(results.result, results.winner)
                setTimeout(function () {
                    // Don't send 2 message at the same time = not displayed
                    _this.emitter.emitMessage('Game duration: ' + gameDurationMinutes_1 + ' minutes.')
                }, 500)
                _this.stop()
                onGameEnded(gameDurationMinutes_1)
                console.log(results.result)
                console.log('income: ' + ((_a = results.winner) === null || _a === void 0 ? void 0 : _a.income))
            }
        }, INTERVAL_SPEED)
        this.isRunning = true
    }
    GameLoop.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.isRunning = false
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
