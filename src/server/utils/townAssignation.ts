import { Map } from '../model/map/Map'
import { shuffleArray } from '../../utils/shuffleArray'
import { Town } from '../model/map/Tile'
import { StickUnit } from '../model/actors/units/StickUnit'
import { Position } from '../model/actors/Position'
import { TILE_WIDTH_HEIGHT } from '../../common/UNITS'
import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { HumanPlayer } from '../model/player/HumanPlayer'
import { IAPlayer } from '../model/player/IAPlayer'
import { UnitsProcessor } from '../engine/UnitsProcessor'

export const townAssignation = (players: AbstractPlayer[], map: Map, unitsProcessor: UnitsProcessor) => {
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

    const shuffledTowns: Town[] = shuffleArray(towns)

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

const addUnitToTown = (town: Town, unitsProcessor: UnitsProcessor) => {
    if (town.player instanceof HumanPlayer || town.player instanceof IAPlayer) {
        const x = town.x
        const y = town.y
        const unit = new StickUnit(
            town.player,
            new Position(x * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2, y * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2)
        )
        unitsProcessor.addUnit(unit, town.player, x, y)
    }
}
