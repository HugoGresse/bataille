'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.round32 = void 0
const UNITS_1 = require('../common/UNITS')
const round32 = (value) => Math.floor(value / UNITS_1.TILE_WIDTH_HEIGHT)
exports.round32 = round32
