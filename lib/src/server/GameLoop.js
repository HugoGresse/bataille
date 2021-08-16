"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLoop = void 0;
var FRAME_RATE = 20;
var INTERVAL_SPEED = 1000 / FRAME_RATE;
var GameLoop = /** @class */ (function () {
    function GameLoop(emitter) {
        this.emitter = emitter;
        this.intervalId = null;
        this.isRunning = false;
    }
    GameLoop.prototype.start = function (game, onGameEnded) {
        var _this = this;
        console.log('Loop started');
        var startTime = Date.now();
        this.intervalId = setInterval(function () {
            var winner = _this.run(game);
            if (!winner) {
                _this.emitGameState(game);
            }
            else {
                _this.stop();
                onGameEnded((Date.now() - startTime) / 1000);
            }
        }, INTERVAL_SPEED);
        this.isRunning = true;
    };
    GameLoop.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.isRunning = false;
        }
    };
    GameLoop.prototype.run = function (game) {
        var endedGame = game.update();
        return endedGame;
    };
    GameLoop.prototype.emitGameState = function (game) {
        this.emitter.emitGameUpdate(game);
    };
    return GameLoop;
}());
exports.GameLoop = GameLoop;
