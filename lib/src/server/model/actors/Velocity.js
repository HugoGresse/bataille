'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Velocity = void 0
class Velocity {
    constructor(speed) {
        this.speed = speed
    }
    /**
     * Adjust the unit velocity depending of the current unit location
     */
    modulate(position, map) {
        const coords = position.getRounded()
        const tile = map.getTileAt(coords.x, coords.y)
        if (tile === null || tile === void 0 ? void 0 : tile.velocityFactor) {
            return this.speed * (tile === null || tile === void 0 ? void 0 : tile.velocityFactor)
        }
        return this.speed
    }
}
exports.Velocity = Velocity
