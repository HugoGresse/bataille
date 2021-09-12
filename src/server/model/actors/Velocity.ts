import { GameMap } from '../map/GameMap'
import { Position } from './Position'

export class Velocity {
    constructor(public readonly speed: number) {}

    /**
     * Adjust the unit velocity depending of the current unit location
     */
    public modulate(position: Position, map: GameMap): number {
        const coords = position.getRounded()
        const tile = map.getTileAt(coords.x, coords.y)
        if (tile?.velocityFactor) {
            return this.speed * tile?.velocityFactor
        }
        return this.speed
    }
}
