'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.detectUnitsIntersections = void 0
var xyMapToArray_1 = require('../utils/xyMapToArray')
var getKeys_1 = require('../utils/getKeys')
var createUnitMaps_1 = require('./utils/createUnitMaps')
/**
 * Detect unit collision to make them fight
 * 1. Make a XY array of units on a given square
 * 2. Take collision between only the two first units and reduce their life between each other
 * 3. Remove dead units
 */
var detectUnitsIntersections = function (players) {
    var playersValues = Object.values(players)
    // 1.
    var unitsMaps = createUnitMaps_1.createUnitMaps(playersValues)
    // 2.
    var tempUnits = null
    var unit = null
    var pastUnit = null
    var pastUnitLife = 0
    var currentUnitLife = 0
    getKeys_1.getKeys(unitsMaps).forEach(function (x) {
        getKeys_1.getKeys(unitsMaps[x]).forEach(function (y) {
            tempUnits = unitsMaps[x][y]
            if (tempUnits.length < 2) {
                return
            }
            pastUnit = unitsMaps[x][y][0]
            unit = unitsMaps[x][y][1]
            pastUnitLife = pastUnit.life.getHP()
            currentUnitLife = unit.life.getHP()
            pastUnit.life.takeDamage(unit.damage * currentUnitLife)
            unit.life.takeDamage(pastUnit.damage * pastUnitLife)
        })
    })
    // 3.
    playersValues.forEach(function (player) {
        var units = player.getUnits()
        xyMapToArray_1.iterateOnXYMap(units, function (unit, x, y) {
            if (units[x][y].life.getHP() <= 0) {
                delete units[x][y]
            }
        })
    })
}
exports.detectUnitsIntersections = detectUnitsIntersections
