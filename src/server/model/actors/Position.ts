import {Velocity} from './Velocity'

export class Position {

    constructor(public x: number, public y: number) {

    }

    get(){
        return {
            x: this.x,
            y: this.y
        }
    }

    /**
     * @return true if the target has been reached
     */
    move(target: Position, velocity: Velocity): boolean {

        const vector = pointMakeVector(this, target);
        const vLength = length(vector);

        if (vLength == 0) {
            return false
        }

        const factor = velocity.speed / vLength;

        this.x = this.x + factor * vector.x;
        this.y = this.y + factor * vector.y;

        // Did we reach the target?
        if (Math.abs(this.x - target.x) < 0.5 && Math.abs(this.y - target.y) < 0.5) {
            return true
        }

        return false
    }

}

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
