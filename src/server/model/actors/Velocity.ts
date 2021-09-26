import { Tile } from '../map/Tile'
import { Position } from './Position'

export class Velocity {
    constructor(public readonly speed: number) {}

    /**
     * Adjust the unit velocity depending of the current unit location
     */
    public modulate(position: Position, tile: Tile | null): number {
        if (tile) {
            return this.speed * tile.velocityFactor
        }
        return this.speed
    }
}
