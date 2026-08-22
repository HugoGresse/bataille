import * as Phaser from 'phaser'
import { Actor } from './Actor'
import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { DEPTH_UNIT } from '../scenes/depth'
import { BatailleScene } from '../scenes/bataille/BatailleScene'

export class StickUnit extends Actor {
    private ownerColor: string | null = null

    constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
        super(scene, id, x, y, 'tilesSpriteSheet', 20)

        this.setInteractive()
        const input = this.input!
        input.hitArea.x -= 2
        input.hitArea.y -= 2
        input.hitArea.setSize(TILE_WIDTH_HEIGHT + 4, TILE_WIDTH_HEIGHT + 4)
        this.on(
            Phaser.Input.Events.GAMEOBJECT_POINTER_UP,
            (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
                // Only swallow the tile selection (destination picking) when the click selected one of our stacks
                const handled = (this.scene as BatailleScene).onUnitClicked(this)
                if (handled) {
                    event.stopPropagation()
                }
            }
        )
        this.setDepth(DEPTH_UNIT)
    }

    setColor(color: string) {
        this.ownerColor = color
        super.setColor(color)
    }

    isOwnedByCurrentPlayer(currentPlayerColor: string | undefined): boolean {
        if (!currentPlayerColor || !this.ownerColor) {
            return false
        }
        // Player state colors are '0xRRGGBB' while unit state colors are '#RRGGBB'
        return this.normalizeColor(this.ownerColor) === this.normalizeColor(currentPlayerColor)
    }

    private normalizeColor(color: string): string {
        return color.replace('0x', '').replace('#', '').toLowerCase()
    }
}
