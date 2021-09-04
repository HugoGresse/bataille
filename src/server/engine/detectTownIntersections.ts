import { Map } from '../model/map/Map'
import { iterateOnXYMap } from '../utils/xyMapToArray'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { AbstractPlayer } from '../model/player/AbstractPlayer'

export const detectTownIntersections = (map: Map, player: AbstractPlayer) => {
    // Detect unit on a tile
    const units = player.getUnits()

    iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
        const tileX = map.getMapTiles()[x]
        if (tileX) {
            const tile = tileX[y]
            if (tile && tile.isTown && (!tile.player || tile.player.id !== player.id)) {
                tile.player = player
                unit.life.takeDamage(1)
            } else if (!tile) {
                // console.log('tile not correct', x, y)
            }
        }
    })
}
