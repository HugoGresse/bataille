import {Velocity} from './Velocity'
import {TILE_WIDTH_HEIGHT} from '../../../common/UNITS'

export class Position {

    // real position used for the movement
    private rX: number
    private rY: number

    constructor(public x: number, public y: number) {
        this.rX = x
        this.rY = y
    }

    get(){
        return {
            x: this.x,
            y: this.y
        }
    }
    getRounded(){
        return {
            x: round32(this.x),
            y: round32(this.y)
        }
    }
    getRoundedPosition(){
        const rounded = this.getRounded()
        return new Position(rounded.x, rounded.y)
    }

    /**
     * @return true if the target has been reached
     */
    move(target: Position, velocity: Velocity): boolean {
        const vector = pointMakeVector(new Position(this.rX, this.rY), target);
        const vLength = length(vector);

        if (vLength == 0) {
            return false
        }

        const factor = velocity.speed / vLength;

        this.rX = this.rX + factor * vector.x;
        this.rY = this.rY + factor * vector.y;

        this.x = round32(this.rX) * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        this.y = round32(this.rY) * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2

        // Did we reach the target?
        if (Math.abs(this.rX - target.x) < 1 && Math.abs(this.rY - target.y) < 1) {
            return true
        }

        return false
    }

}

const round32 = (value: number) => Math.floor(value/TILE_WIDTH_HEIGHT)

const pointMakeVector = (point1: Position, point2: Position) => {
    let xDist, yDist;

    xDist = point2.x - point1.x;
    yDist = point2.y - point1.y;

    return {
        x: xDist,
        y: yDist
    };
}

const length = (vector: {
    x: number,
    y: number
}) => {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}
