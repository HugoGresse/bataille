import {Player} from './Player'
import {Map} from './map/Map'
import {iterateOnXYMap} from '../utils/xyMapToArray'
import {BaseUnit} from './actors/units/BaseUnit'

export const detectIntersection = (map: Map, player: Player) => {

     // Detect unit on a tile
    const units = player.getUnits()

    iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
        const tileX = map.getMapTiles()[x]
        if(tileX) {
            const tile = tileX[y]
            if(tile.isTown && (!tile.player ||tile.player.id !== player.id)) {
                tile.player = player
                unit.life.takeDamage(1)
            }
        }

    })
}
