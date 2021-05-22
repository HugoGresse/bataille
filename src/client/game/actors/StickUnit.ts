import {Actor} from './Actor'
import {UNIT_STICK} from '../../../constants/UNITS'
import {UnitState} from '../../../server/model/GameState'

export class StickUnit extends Actor {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, UNIT_STICK);

        // PHYSICS
        this.getBody().setSize(30, 30);
        this.getBody().setOffset(8, 0);
    }

    update(refUnit: UnitState): void {
        this.body.x =refUnit.position.x
        this.body.y =refUnit.position.y
        // this.getBody().setVelocity(0);
        //
        // if (this.keyW?.isDown) {
        //     this.body.velocity.y = -500;
        // }
        //
        // if (this.keyA?.isDown) {
        //     this.body.velocity.x = -110;
        //     this.checkFlip();
        //     // this.getBody().setOffset(48, 15);
        // }
        //
        // if (this.keyS?.isDown) {
        //     this.body.velocity.y = 110;
        // }
        //
        // if (this.keyD?.isDown) {
        //     this.body.velocity.x = 110;
        //     this.checkFlip();
        //     // this.getBody().setOffset(15, 15);
        // }
    }
}
