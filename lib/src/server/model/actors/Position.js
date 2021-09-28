'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Position = void 0
const Round32_1 = require('../../../utils/Round32')
const SPEED_FACTOR = 2800 // increase to slow down movements
class Position {
    constructor(x, y) {
        this.x = x
        this.y = y
        this.nextMoveTime = 0 // wait before next move (use map terrain to adjust)
        this.rX = x
        this.rY = y
    }
    get() {
        return {
            x: this.x,
            y: this.y,
        }
    }
    getRounded() {
        return {
            x: Round32_1.round32(this.x),
            y: Round32_1.round32(this.y),
        }
    }
    getRoundedPosition() {
        const rounded = this.getRounded()
        return new Position(rounded.x, rounded.y)
    }
    /**
     * @return true if the target has been reached
     */
    move(target, velocity, map) {
        const currentRoundedPos = this.getRounded()
        const currentTile = map.getTileAt(currentRoundedPos.x, currentRoundedPos.y)
        const speed = velocity.modulate(this, currentTile)
        const now = Date.now()
        if (this.nextMoveTime === 0) {
            this.nextMoveTime = now + SPEED_FACTOR / speed
            return false
        }
        if (now > this.nextMoveTime) {
            this.nextMoveTime = 0
            this.x = target[0]
            this.y = target[1]
            this.rX = Round32_1.round32(this.x)
            this.rY = Round32_1.round32(this.y)
            return true
        }
        return false
    }
    copyFrom(position) {
        this.x = position.x
        this.y = position.y
        this.rX = position.rX
        this.rY = position.rY
    }
}
exports.Position = Position
