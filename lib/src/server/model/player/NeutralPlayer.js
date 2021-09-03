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
exports.NeutralPlayerInstance = exports.NeutralPlayer = void 0
var AbstractPlayer_1 = require('./AbstractPlayer')
var NeutralPlayer = /** @class */ (function (_super) {
    __extends(NeutralPlayer, _super)
    function NeutralPlayer() {
        return _super.call(this, 'Neutral', '0x888888') || this
    }
    return NeutralPlayer
})(AbstractPlayer_1.AbstractPlayer)
exports.NeutralPlayer = NeutralPlayer
exports.NeutralPlayerInstance = new NeutralPlayer()
