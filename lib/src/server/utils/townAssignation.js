'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.townAssignation = void 0
const shuffleArray_1 = require('../../utils/shuffleArray')
const StickUnit_1 = require('../model/actors/units/StickUnit')
const Position_1 = require('../model/actors/Position')
const UNITS_1 = require('../../common/UNITS')
const HumanPlayer_1 = require('../model/player/HumanPlayer')
const IAPlayer_1 = require('../model/player/IAPlayer')
const townAssignation = (players, map, unitsProcessor) => {
    const townsByCountries = map.getTownsByCountries()
    const towns = Object.keys(townsByCountries)
        .flatMap((countryId) => {
            if (townsByCountries[countryId].length < 2) {
                // Only country with more than one town can be auto-assigned
                return null
            }
            return townsByCountries[countryId]
        })
        .filter((town) => {
            return !!town
        })
    // Only let 1/5 of the towns to be assigned to player at start
    const townByPlayer = Math.floor(towns.length / players.length / 5)
    const shuffledTowns = shuffleArray_1.shuffleArray(towns)
    let i = 0
    let playerIndex = 0
    for (const town of shuffledTowns) {
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
const addUnitToTown = (town, unitsProcessor) => {
    if (town.player instanceof HumanPlayer_1.HumanPlayer || town.player instanceof IAPlayer_1.IAPlayer) {
        const x = town.x
        const y = town.y
        const unit = new StickUnit_1.StickUnit(
            town.player,
            new Position_1.Position(
                x * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2,
                y * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2
            )
        )
        unitsProcessor.addUnit(unit, town.player, x, y)
    }
}
