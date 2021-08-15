import { Player } from '../model/Player'
import { Map } from '../model/map/Map'
import { shuffleArray } from '../../utils/shuffleArray'
import { Tile } from '../model/map/Tile'
import { iterateOnXYMap } from './xyMapToArray'
import { StickUnit } from '../model/actors/units/StickUnit'
import { Position } from '../model/actors/Position'
import { TILE_WIDTH_HEIGHT } from '../../common/UNITS'

export const townAssignation = (players: Player[], map: Map) => {
    const towns = map.getTowns()

    // Only let 1/5 of the towns to be assigned to player at start
    const townByPlayer = Math.floor(towns.length / players.length / 5)

    const shuffledTowns: Tile[] = shuffleArray(towns)

    let i = 0
    let playerIndex = 0

    for (const town of shuffledTowns) {
        town.player = players[playerIndex]
        town.isNeutral = false
        i += 1
        if (i >= townByPlayer) {
            playerIndex += 1
            i = 0
        }
        if (playerIndex >= players.length) {
            break
        }
    }

    const mapTiles = map.getMapTiles()

    iterateOnXYMap(mapTiles, (tile: Tile, x, y) => {
        if (tile.isTown && tile.player && !tile.isNeutral) {
            tile.player.addUnit(
                new StickUnit(
                    tile.player,
                    new Position(
                        x * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2,
                        y * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
                    )
                ),
                x,
                y
            )
        }
    })
}
