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
        this.gameDuration = 0
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
                // let users speaks at the end of the game...
                _this.gameDuration = Math.round(((Date.now() - startTime) / 1000 / 60) * 100) / 100
                _this.emitGameState(game)
                _this.emitter.emitMessage(results.result, results.winner)
                setTimeout(function () {
                    // Don't send 2 message at the same time = not displayed
                    _this.emitter.emitMessage('Game duration: ' + _this.gameDuration + ' minutes.')
                }, 1000)
                console.log(results.result)
                console.log('income: ' + ((_a = results.winner) === null || _a === void 0 ? void 0 : _a.income))
                _this.stop()
            }
            var connectedPlayers = game.getConnectedPlayers().length
            if (!connectedPlayers) {
                onGameEnded(_this.gameDuration)
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
