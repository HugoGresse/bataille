'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Position = void 0
var UNITS_1 = require('../../../common/UNITS')
var Round32_1 = require('../../../utils/Round32')
var Position = /** @class */ (function () {
    function Position(x, y) {
        this.x = x
        this.y = y
        this.rX = x
        this.rY = y
    }
    Position.prototype.get = function () {
        return {
            x: this.x,
            y: this.y,
        }
    }
    Position.prototype.getRounded = function () {
        return {
            x: Round32_1.round32(this.x),
            y: Round32_1.round32(this.y),
        }
    }
    Position.prototype.getRoundedPosition = function () {
        var rounded = this.getRounded()
        return new Position(rounded.x, rounded.y)
    }
    /**
     * @return true if the target has been reached
     */
    Position.prototype.move = function (target, speed) {
        var vector = pointMakeVector(new Position(this.rX, this.rY), target)
        var vLength = length(vector)
        if (vLength == 0) {
            return true
        }
        var factor = speed / vLength
        this.rX = this.rX + factor * vector.x
        this.rY = this.rY + factor * vector.y
        this.x = Round32_1.round32(this.rX) * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2
        this.y = Round32_1.round32(this.rY) * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2
        // Did we reach the target?
        if (Math.abs(this.rX - target.x) < DELTA_TARGET_REACH && Math.abs(this.rY - target.y) < DELTA_TARGET_REACH) {
            return true
        }
        return false
    }
    return Position
})()
exports.Position = Position
var DELTA_TARGET_REACH = 3
var pointMakeVector = function (point1, point2) {
    var xDist, yDist
    xDist = point2.x - point1.x
    yDist = point2.y - point1.y
    return {
        x: xDist,
        y: yDist,
    }
}
var length = function (vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}
