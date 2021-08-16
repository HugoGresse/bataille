'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.detectUnitsIntersections = void 0
var xyMapToArray_1 = require('../utils/xyMapToArray')
/**
 * Detect unit collision to make them fight
 * 1. Make a XY array of units on a given square
 * 2. Take collision between only the two first units and reduce their life between each other
 * 3. Remove dead units
 */
var detectUnitsIntersections = function (players) {
    var unitsMaps = {}
    // 1.
    Object.values(players).forEach(function (player) {
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
    // 2.
    var tempUnits = null
    var unit = null
    var pastUnit = null
    Object.keys(unitsMaps)
        .map(Number)
        .forEach(function (x) {
            Object.keys(unitsMaps[x])
                .map(Number)
                .forEach(function (y) {
                    tempUnits = unitsMaps[x][y]
                    if (tempUnits.length < 2) {
                        return
                    }
                    pastUnit = unitsMaps[x][y][0]
                    unit = unitsMaps[x][y][1]
                    pastUnit.life.takeDamage(unit.damage)
                    unit.life.takeDamage(pastUnit.damage)
                })
        })
    // 3.
    Object.values(players).forEach(function (player) {
        var units = player.getUnits()
        xyMapToArray_1.iterateOnXYMap(units, function (unit, x, y) {
            if (units[x][y].life.getHP() <= 0) {
                delete units[x][y]
            }
        })
    })
}
exports.detectUnitsIntersections = detectUnitsIntersections
