import { round32 } from '../../../utils/Round32'
import { Velocity } from './Velocity'
import { GameMap } from '../map/GameMap'
import { SPEED_FACTOR } from '../../../common/UNITS'
import { SERVER_TICK_MS } from '../../../common/GameSettings'

export class Position {
    // real position used for the movement
    private rX: number
    private rY: number
    private nextMoveTime: number = 0 // wait before next move (use map terrain to adjust)

    constructor(
        public x: number,
        public y: number
    ) {
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
    move(target: number[], velocity: Velocity, map: GameMap, now: number = Date.now()): boolean {
        const currentRoundedPos = this.getRounded()
        const currentTile = map.getTileAt(currentRoundedPos.x, currentRoundedPos.y)
        const speed = velocity.modulate(this, currentTile)

        if (this.nextMoveTime === 0) {
            this.nextMoveTime = now + SPEED_FACTOR / speed
            return false
        }

        if (now > this.nextMoveTime) {
            this.x = target[0]
            this.y = target[1]
            this.rX = round32(this.x)
            this.rY = round32(this.y)
            // The next wait is set now, from the tile just stepped onto, so the time of the next step is
            // known (and reported) the moment this one lands. It starts a tick from now, as it always has.
            const newRoundedPos = this.getRounded()
            const newSpeed = velocity.modulate(this, map.getTileAt(newRoundedPos.x, newRoundedPos.y))
            this.nextMoveTime = now + SERVER_TICK_MS + SPEED_FACTOR / newSpeed
            return true
        }

        return false
    }

    /** The unit has arrived: its next journey starts with a full wait on the tile it is on */
    stopWaiting() {
        this.nextMoveTime = 0
    }

    /**
     * How long until this unit takes its next step, so a client can glide it there and arrive as it
     * lands: the first tick strictly after the wait is up. Undefined when no wait is running, or the
     * ground holds it for good.
     */
    msUntilNextStep(now: number = Date.now()): number | undefined {
        if (!this.nextMoveTime || !Number.isFinite(this.nextMoveTime)) {
            return undefined
        }
        return (Math.floor(Math.max(0, this.nextMoveTime - now) / SERVER_TICK_MS) + 1) * SERVER_TICK_MS
    }

    copyFrom(position: Position) {
        this.x = position.x
        this.y = position.y
        this.rX = position.rX
        this.rY = position.rY
    }
}
