'use strict'
var __extends =
    (this && this.__extends) ||
    (function () {
        var extendStatics = function (d, b) {
            extendStatics =
                Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array &&
                    function (d, b) {
                        d.__proto__ = b
                    }) ||
                function (d, b) {
                    for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]
                }
            return extendStatics(d, b)
        }
        return function (d, b) {
            if (typeof b !== 'function' && b !== null)
                throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null')
            extendStatics(d, b)
            function __() {
                this.constructor = d
            }
            d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __())
        }
    })()
Object.defineProperty(exports, '__esModule', { value: true })
exports.HumanPlayer = void 0
var AbstractPlayer_1 = require('./AbstractPlayer')
var HumanPlayer = /** @class */ (function (_super) {
    __extends(HumanPlayer, _super)
    function HumanPlayer(socket, color, name) {
        var _this = _super.call(this, name, color) || this
        _this.socket = socket
        return _this
    }
    HumanPlayer.prototype.listenForDisconnect = function (socketEmitter, onPlayerDisconnect) {
        var _this = this
        this.socket.on('disconnect', function () {
            socketEmitter.emitMessage('\u2139\uFE0F\uFE0F Player disconnected: ' + _this.name, _this)
            _this.setConnected(false)
            onPlayerDisconnect()
        })
    }
    HumanPlayer.prototype.getSocketId = function () {
        return this.socket.id
    }
    return HumanPlayer
})(AbstractPlayer_1.AbstractPlayer)
exports.HumanPlayer = HumanPlayer
