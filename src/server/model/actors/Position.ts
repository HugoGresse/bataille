import { round32 } from '../../../utils/Round32'
import { Velocity } from './Velocity'
import { GameMap } from '../map/GameMap'

const SPEED_FACTOR = 2800 // increase to slow down movements

export class Position {
    // real position used for the movement
    private rX: number
    private rY: number
    private nextMoveTime: number = 0 // wait before next move (use map terrain to adjust)

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
    move(target: number[], velocity: Velocity, map: GameMap): boolean {
        const currentRoundedPos = this.getRounded()
        const currentTile = map.getTileAt(currentRoundedPos.x, currentRoundedPos.y)
        const speed = velocity.modulate(this, currentTile)
        const now = Date.now()

        if (this.nextMoveTime === 0) {
            this.nextMoveTime = now + SPEED_FACTOR / speed
            return false
        }

        if (now > this.nextMoveTime) {
            this.nextMoveTime = 0
            this.x = target[0]
            this.y = target[1]
            this.rX = round32(this.x)
            this.rY = round32(this.y)
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
