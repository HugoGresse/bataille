'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.round32 = void 0
var UNITS_1 = require('../common/UNITS')
var round32 = function (value) {
    return Math.floor(value / UNITS_1.TILE_WIDTH_HEIGHT)
}
exports.round32 = round32
