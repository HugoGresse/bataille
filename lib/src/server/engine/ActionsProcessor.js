'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ActionsProcessor = void 0
const UNITS_1 = require('../../common/UNITS')
const Position_1 = require('../model/actors/Position')
const StickUnit_1 = require('../model/actors/units/StickUnit')
class ActionsProcessor {
    constructor(map, unitsProcessor) {
        this.map = map
        this.unitsProcessor = unitsProcessor
    }
    addUnit(player, { x, y }) {
        if (player.money >= UNITS_1.UnitsType.Stick) {
            const position = new Position_1.Position(
                x + UNITS_1.TILE_WIDTH_HEIGHT / 2,
                y + UNITS_1.TILE_WIDTH_HEIGHT / 2
            )
            const gridPosition = position.getRoundedPosition()
            const town = this.map.getTileAt(gridPosition.x, gridPosition.y)
            if (!town || !town.player || town.player.id !== player.id) {
                return null
            }
            const unit = new StickUnit_1.StickUnit(player, position)
            const createdUnit = this.unitsProcessor.addUnit(unit, player, gridPosition.x, gridPosition.y)
            if (createdUnit) {
                player.spendMoney(UNITS_1.UnitsType.Stick)
                return createdUnit
            }
        }
        return null
    }
    unitEvent(player, event) {
        this.unitsProcessor.unitAction(player, event)
    }
}
exports.ActionsProcessor = ActionsProcessor
