'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.createUnitMaps = void 0
var xyMapToArray_1 = require('../../utils/xyMapToArray')
var createUnitMaps = function (player) {
    var unitsMaps = {}
    player.forEach(function (player) {
        var units = player.getUnits()
        xyMapToArray_1.iterateOnXYMap(units, function (unit, x, y) {
            if (!unitsMaps[x]) {
                unitsMaps[x] = {}
            }
            if (!unitsMaps[x][y]) {
                unitsMaps[x][y] = [unit]
            } else {
                unitsMaps[x][y].push(unit)
            }
        })
    })
    return unitsMaps
}
exports.createUnitMaps = createUnitMaps
