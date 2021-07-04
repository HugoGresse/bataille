import {Actor} from './Actor'
import {UnitState} from '../../../server/model/GameState'
import {TILE_WIDTH_HEIGHT} from '../../../common/UNITS'
import {DEPTH_UNIT} from '../scenes/depth'
import {BaseScene} from '../scenes/BaseScene'

export let isUnitDragging = false

export class StickUnit extends Actor {

    public static isDragging () : boolean {
        return isUnitDragging
    }

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
        isUnitDragging = true;
        this.onSelect()
    }

    onDragEnd() {
        isUnitDragging = false;
        this.onUnselect()
    }

    onDrag(pointer: PointerEvent, dragX: number, dragY: number) {
        (this.scene as BaseScene).actions.moveUnit(this, dragX, dragY)
    }

    update(refUnit: UnitState): void {
        super.update(refUnit)

        if(refUnit.position.x !== this.x && !this.scene.tweens.isTweening(this)){
            this.scene.tweens.add({
                targets: this,
                x: {
                    from:this.x,
                    to: refUnit.position.x
                },
                ease: 'Linear',
                duration: 100,
            })

        }
        if(refUnit.position.y !== this.y && !this.scene.tweens.isTweening(this)){
            this.scene.tweens.add({
                targets: this,
                y: {
                  from:this.y,
                  to: refUnit.position.y
                },
                ease: 'Linear',
                duration: 100,
            })
        }
    }
}
