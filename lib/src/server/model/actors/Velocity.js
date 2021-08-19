'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Velocity = void 0
var Velocity = /** @class */ (function () {
    function Velocity(speed) {
        this.speed = speed
    }
    /**
     * Adjust the unit velocity depending of the current unit location
     */
    Velocity.prototype.modulate = function (position, map) {
        var coords = position.getRounded()
        var tile = map.getTileAt(coords.x, coords.y)
        if (tile === null || tile === void 0 ? void 0 : tile.velocityFactor) {
            return this.speed * (tile === null || tile === void 0 ? void 0 : tile.velocityFactor)
        }
        return this.speed
    }
    return Velocity
})()
exports.Velocity = Velocity
