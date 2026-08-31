import * as Phaser from 'phaser'
import { Tilemaps, Input } from 'phaser'
import { BatailleScene } from './BatailleScene'
import { TileType } from '../../../../common/TileType'
import { INPUT_LAYERS_SKIP } from '../../../../server/model/map/EXPORTED_LAYER_NAMES'
import { consumeUIPointer } from '../../utils/uiEventGuard'
import { devicePx } from '../../utils/renderScale'

type Tile = Tilemaps.Tile

/** Screen pixels max between pointer down and up for it to count as a click (not a camera pan) */
const CLICK_MAX_DISTANCE = devicePx(15)

export class TileSelection {
    private selectedTile: Tile | null = null

    constructor(
        private scene: BatailleScene,
        private map: Phaser.Tilemaps.Tilemap
    ) {}

    start(): void {
        const layersReverse = [...this.map.layers].reverse()

        const findTileAt = (pointer: Input.Pointer): Tile | null => {
            for (const layer of layersReverse) {
                if (INPUT_LAYERS_SKIP.includes(layer.name)) {
                    continue
                }
                const tile = this.map.getTileAtWorldXY(pointer.worldX, pointer.worldY, false, undefined, layer.name)
                if (tile) {
                    return tile
                }
            }
            return null
        }

        // Live path preview while a stack is selected (move mode)
        this.scene.input.on('pointermove', (pointer: Input.Pointer) => {
            if (!this.scene.isUnitMoveSelectionActive()) {
                return
            }
            const tile = findTileAt(pointer)
            if (tile) {
                this.scene.onPathPreviewHovered(tile)
            }
        })

        this.scene.input.on('pointerup', (pointer: Input.Pointer) => {
            // Clicks on UI scene widgets (buttons, slider...) must not select tiles or move units
            if (consumeUIPointer(pointer)) {
                return
            }
            // Camera pan gestures must not select tiles or move units. The travel is read off the
            // pointer rather than tracked here: `globalTopOnly` skips this scene entirely whenever
            // the press landed on a HUD widget, so a locally recorded press point goes stale.
            if (pointer.getDistance() > CLICK_MAX_DISTANCE) {
                return
            }
            const tile = findTileAt(pointer)

            if (tile) {
                if (this.scene.isUnitMoveSelectionActive()) {
                    // A stack is selected: this click is the move destination
                    this.scene.onMoveDestinationSelected(tile, pointer.worldX, pointer.worldY, pointer)
                } else {
                    this.onTilePress(tile)
                }
            }
        })
        this.scene.events.on('destroy', () => {
            this.scene.events.off('pointerup')
            this.scene.events.off('pointermove')
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
