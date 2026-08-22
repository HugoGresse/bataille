import * as Phaser from 'phaser'
import { Tilemaps, Input } from 'phaser'
import { BatailleScene } from './BatailleScene'
import { TileType } from '../../../../common/TileType'
import { INPUT_LAYERS_SKIP } from '../../../../server/model/map/EXPORTED_LAYER_NAMES'
import { consumeUIPointer } from '../../utils/uiEventGuard'

type Tile = Tilemaps.Tile

/** Screen pixels max between pointer down and up for it to count as a click (not a camera pan) */
const CLICK_MAX_DISTANCE = 15

export class TileSelection {
    private selectedTile: Tile | null = null

    constructor(
        private scene: BatailleScene,
        private map: Phaser.Tilemaps.Tilemap
    ) {}

    start(): void {
        let downScreenX = 0
        let downScreenY = 0

        this.scene.input.on('pointerdown', (pointer: Input.Pointer) => {
            downScreenX = pointer.x
            downScreenY = pointer.y
        })

        const layersReverse = [...this.map.layers].reverse()
        this.scene.input.on('pointerup', (pointer: Input.Pointer) => {
            // Clicks on UI scene widgets (buttons, slider...) must not select tiles or move units
            if (consumeUIPointer()) {
                return
            }
            // Camera pan gestures must not select tiles or move units
            if (Phaser.Math.Distance.Between(downScreenX, downScreenY, pointer.x, pointer.y) > CLICK_MAX_DISTANCE) {
                return
            }
            for (const layer of layersReverse) {
                if (INPUT_LAYERS_SKIP.includes(layer.name)) {
                    continue
                }
                const tile = this.map.getTileAtWorldXY(pointer.worldX, pointer.worldY, false, undefined, layer.name)

                if (tile) {
                    if (this.scene.isUnitMoveSelectionActive()) {
                        // A stack is selected: this click is the move destination
                        this.scene.onMoveDestinationSelected(tile, pointer.worldX, pointer.worldY)
                    } else {
                        this.onTilePress(tile)
                    }
                    return
                }
            }
        })
        this.scene.events.on('destroy', () => {
            this.scene.events.off('pointerup')
            this.scene.events.off('pointerdown')
        })
    }

    onTilePress(tile: Tile) {
        if (this.selectedTile) {
            this.selectedTile.index -= 1 // Change displayed tile to not selected
        }

        this.selectedTile = tile
        this.selectedTile.index += 1 // Update the display tile from the tilemap image

        if (tile.index !== TileType.TownSelected) {
            this.scene.getUIScene().onEmptyTileSelected()
        }
    }
}
