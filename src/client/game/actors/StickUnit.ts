import { Actor } from './Actor'
import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { DEPTH_UNIT } from '../scenes/depth'
import { BaseScene } from '../scenes/BaseScene'

export let isUnitDragging: string | null = null

type PointerPhaser = {
    worldX: number
    worldY: number
}

export class StickUnit extends Actor {
    timerId: NodeJS.Timeout | null = null

    public static isDragging(): boolean {
        return !!isUnitDragging
    }

    constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
        super(scene, id, x, y, 'tilesSpriteSheet', 20)

        const throttleFunction = (func: () => any, delay: number) => {
            if (this.timerId) {
                return
            }
            this.timerId = setTimeout(() => {
                func()
                this.timerId = null
            }, delay)
        }

        this.setInteractive({ draggable: true })
        this.input.hitArea.x -= 2
        this.input.hitArea.y -= 2
        this.input.hitArea.setSize(TILE_WIDTH_HEIGHT + 4, TILE_WIDTH_HEIGHT + 4)
        this.on('dragstart', this.onDragStart)
        this.on('dragend', this.onDragEnd)
        this.on('drag', (pointer: PointerPhaser) => throttleFunction(() => this.onDrag(pointer), 200))
        this.setDepth(DEPTH_UNIT)
    }

    destroy() {
        super.destroy()
        if (isUnitDragging === this.id) {
            isUnitDragging = null
        }
    }

    onDragStart() {
        isUnitDragging = this.id
        this.onSelect()
    }

    onDragEnd() {
        isUnitDragging = null
        this.onUnselect()
    }

    onDrag(pointer: PointerPhaser) {
        if (!this.scene) {
            return // debounced and deleted in between
        }
        ;(this.scene as BaseScene).actions.moveUnit(this, pointer.worldX, pointer.worldY)
    }
}
