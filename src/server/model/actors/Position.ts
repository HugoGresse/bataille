import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { round32 } from '../../../utils/Round32'
import { Velocity } from './Velocity'
import { GameMap } from '../map/GameMap'

export class Position {
    // real position used for the movement
    private rX: number
    private rY: number

    constructor(public x: number, public y: number) {
        this.rX = x
        this.rY = y
    }

    get() {
        return {
            x: this.x,
            y: this.y,
        }
    }
    getRounded() {
        return {
            x: round32(this.x),
            y: round32(this.y),
        }
    }
    getRoundedPosition() {
        const rounded = this.getRounded()
        return new Position(rounded.x, rounded.y)
    }

    /**
     * @return true if the target has been reached
     */
    move(target: Position, velocity: Velocity, map: GameMap): boolean {
        const currentRoundedPos = this.getRounded()
        const currentTile = map.getTileAt(currentRoundedPos.x, currentRoundedPos.y)
        const speed = velocity.modulate(this, currentTile)

        const vector = pointMakeVector(new Position(this.rX, this.rY), target)
        const vLength = length(vector)

        if (vLength == 0) {
            return true
        }

        const factor = speed / vLength

        this.rX = this.rX + factor * vector.x
        this.rY = this.rY + factor * vector.y
        this.x = round32(this.rX) * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        this.y = round32(this.rY) * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2

        // Did we reach the target?
        if (Math.abs(this.rX - target.x) < DELTA_TARGET_REACH && Math.abs(this.rY - target.y) < DELTA_TARGET_REACH) {
            return true
        }

        return false
    }

    copyFrom(position: Position) {
        this.x = position.x
        this.y = position.y
        this.rX = position.rX
        this.rY = position.rY
    }
}

const DELTA_TARGET_REACH = 3

const pointMakeVector = (point1: Position, point2: Position) => {
    let xDist, yDist

    xDist = point2.x - point1.x
    yDist = point2.y - point1.y

    return {
        x: xDist,
        y: yDist,
    }
}

const length = (vector: { x: number; y: number }) => {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}
