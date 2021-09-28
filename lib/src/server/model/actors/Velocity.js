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
    modulate(position, tile) {
        if (tile) {
            return this.speed * tile.velocityFactor
        }
        return this.speed
    }
}
exports.Velocity = Velocity
