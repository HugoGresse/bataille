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
        if (target.x > this.x) {
            this.x += Math.min(velocity.x, (target.x - this.x))
            if(this.x > target.x){
                this.x = target.x
            }
        } else if (target.x === this.x) {
            // Do nothing
        } else if(target.x < this.x) {
            this.x -= Math.min(velocity.x, (this.x - target.x))
            if(this.x < target.x){
                this.x = target.x
            }
        }

        if (target.y > this.y) {
            this.y += Math.min(velocity.y, (target.y - this.y))
            if(this.y > target.y){
                this.y = target.y
            }
        } else if (target.y === this.y) {
            // Do nothing
        } else if(target.y < this.y) {
            this.y -= Math.min(velocity.y, (this.y - target.y))
            if(this.y < target.y){
                this.y = target.y
            }
        }

        // Did we reach the target?
        if(this.x === target.x && this.y === target.y) {
            return true
        }

        return false
    }

}
