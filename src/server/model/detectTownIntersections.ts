import { HumanPlayer } from './player/HumanPlayer'
import { Map } from './map/Map'
import { iterateOnXYMap } from '../utils/xyMapToArray'
import { BaseUnit } from './actors/units/BaseUnit'

export const detectTownIntersections = (map: Map, player: HumanPlayer) => {
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
                console.log('tile not correct', x, y)
            }
        }
    })
}
