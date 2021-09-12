'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StickUnit = void 0
const BaseUnit_1 = require('./BaseUnit')
const Velocity_1 = require('../Velocity')
const BASE_HP = 1
const BASE_DAMAGE = 1
class StickUnit extends BaseUnit_1.BaseUnit {
    constructor(owner, position) {
        super(owner, position, BASE_DAMAGE, BASE_HP, new Velocity_1.Velocity(6))
    }
}
exports.StickUnit = StickUnit
