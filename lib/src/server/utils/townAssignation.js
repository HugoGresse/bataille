'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.townAssignation = void 0
var shuffleArray_1 = require('../../utils/shuffleArray')
var StickUnit_1 = require('../model/actors/units/StickUnit')
var Position_1 = require('../model/actors/Position')
var UNITS_1 = require('../../common/UNITS')
var HumanPlayer_1 = require('../model/player/HumanPlayer')
var IAPlayer_1 = require('../model/player/IAPlayer')
var townAssignation = function (players, map, unitsProcessor) {
    var townsByCountries = map.getTownsByCountries()
    var towns = Object.keys(townsByCountries)
        .flatMap(function (countryId) {
            if (townsByCountries[countryId].length < 2) {
                // Only country with more than one town can be auto-assigned
                return null
            }
            return townsByCountries[countryId]
        })
        .filter(function (town) {
            return !!town
        })
    // Only let 1/5 of the towns to be assigned to player at start
    var townByPlayer = Math.floor(towns.length / players.length / 5)
    var shuffledTowns = shuffleArray_1.shuffleArray(towns)
    var i = 0
    var playerIndex = 0
    for (var _i = 0, shuffledTowns_1 = shuffledTowns; _i < shuffledTowns_1.length; _i++) {
        var town = shuffledTowns_1[_i]
        town.player = players[playerIndex]
        town.isNeutral = false
        addUnitToTown(town, unitsProcessor)
        i += 1
        if (i >= townByPlayer) {
            playerIndex += 1
            i = 0
        }
        if (playerIndex >= players.length) {
            break
        }
    }
}
exports.townAssignation = townAssignation
var addUnitToTown = function (town, unitsProcessor) {
    if (town.player instanceof HumanPlayer_1.HumanPlayer || town.player instanceof IAPlayer_1.IAPlayer) {
        var x = town.x
        var y = town.y
        var unit = new StickUnit_1.StickUnit(
            town.player,
            new Position_1.Position(
                x * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2,
                y * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2
            )
        )
        unitsProcessor.addUnit(unit, town.player, x, y)
    }
}
