'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ActionsProcessor = void 0
var UNITS_1 = require('../../common/UNITS')
var Position_1 = require('../model/actors/Position')
var StickUnit_1 = require('../model/actors/units/StickUnit')
var ActionsProcessor = /** @class */ (function () {
    function ActionsProcessor(map) {
        this.map = map
    }
    ActionsProcessor.prototype.addUnit = function (player, _a) {
        var x = _a.x,
            y = _a.y
        if (player.money >= UNITS_1.UnitsType.Stick) {
            var position = new Position_1.Position(x + UNITS_1.TILE_WIDTH_HEIGHT / 2, y + UNITS_1.TILE_WIDTH_HEIGHT / 2)
            var gridPosition = position.getRoundedPosition()
            var town = this.map.getTileAt(gridPosition.x, gridPosition.y)
            if (!town || !town.player || town.player.id !== player.id) {
                return null
            }
            var unit = new StickUnit_1.StickUnit(player, position)
            var createdUnit = player.addUnit(unit, gridPosition.x, gridPosition.y)
            if (createdUnit) {
                player.spendMoney(UNITS_1.UnitsType.Stick)
                return createdUnit
            }
        }
        return null
    }
    ActionsProcessor.prototype.unitEvent = function (player, event) {
        player.unitAction(event)
    }
    return ActionsProcessor
})()
exports.ActionsProcessor = ActionsProcessor
