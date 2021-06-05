import {Actor} from './Actor'
import {UnitState} from '../../../server/model/GameState'
import {TILE_WIDTH_HEIGHT} from '../../../common/UNITS'
import {DEPTH_UNIT} from '../scenes/depth'
import {BaseScene} from '../scenes/BaseScene'

export class StickUnit extends Actor {
    constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
        super(scene, id, x, y, "tilesSpriteSheet", 20);

        // PHYSICS
        this.setInteractive({draggable: true})
        this.input.hitArea.setSize(TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT)
        this.on('dragstart', this.onDragStart)
        this.on('dragend', this.onDragEnd)
        this.on('drag', this.onDrag)
        this.setDepth(DEPTH_UNIT)
    }

    onDragStart() {
        this.onSelect()
    }

    onDragEnd() {
        this.onUnselect()
    }

    onDrag(pointer: PointerEvent, dragX: number, dragY: number) {
        (this.scene as BaseScene).actions.moveUnit(this, dragX, dragY)
    }

    update(refUnit: UnitState): void {
        this.x =refUnit.position.x
        this.y =refUnit.position.y
        // if(this.selectedCircle){
        //     this.onSelect()
        // }
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
