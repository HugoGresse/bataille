import * as Phaser from 'phaser'
import { Actor } from './Actor'
import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { DEPTH_UNIT } from '../scenes/depth'
import { BatailleScene } from '../scenes/bataille/BatailleScene'
import { isSameColor } from '../utils/colors'

/** A whole tile responds, plus a couple of pixels of slack */
const HIT = TILE_WIDTH_HEIGHT + 4

export class StickUnit extends Actor {
    private ownerColorString: string | null = null

    constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
        super(scene, id, x, y)

        // Phaser adds displayOrigin (half the container size) to the local hit-test point, so the
        // hit area is expressed from the top-left of that box, not around the origin.
        this.setSize(HIT, HIT)
        this.setInteractive(new Phaser.Geom.Rectangle(0, 0, HIT, HIT), Phaser.Geom.Rectangle.Contains)
        this.on(
            Phaser.Input.Events.GAMEOBJECT_POINTER_UP,
            (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
                // Only swallow the tile selection (destination picking) when the click hit one of our stacks
                const handled = (this.scene as BatailleScene).onUnitClicked(this)
                if (handled) {
                    event.stopPropagation()
                }
            }
        )
        this.setDepth(DEPTH_UNIT)
    }

    setColor(color: string) {
        this.ownerColorString = color
        super.setColor(color)
    }

    isOwnedByCurrentPlayer(currentPlayerColor: string | undefined): boolean {
        return isSameColor(this.ownerColorString ?? undefined, currentPlayerColor)
    }
}
