import { Map } from '../map/Map'
import { Position } from './Position'

export class Velocity {
    constructor(public readonly speed: number) {}

    /**
     * Adjust the unit velocity depending of the current unit location
     */
    public modulate(position: Position, map: Map): number {
        const coords = position.getRounded()
        const tile = map.getTileAt(coords.x, coords.y)
        if (tile?.velocityFactor) {
            return this.speed * tile?.velocityFactor
        }
        return this.speed
    }
}
