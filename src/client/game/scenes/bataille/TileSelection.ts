import * as Phaser from 'phaser'
import { Tilemaps, Input } from 'phaser'
import { BatailleScene, MERGED_RENDER_LAYERS } from './BatailleScene'
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
        // The only layers with a display object are the merged render ones; the source layers are
        // data-only, and world-to-tile conversion needs a display object, so it happens once here
        // and the per-layer lookups below stay in tile coordinates.
        const renderLayer = this.map.getLayer(MERGED_RENDER_LAYERS[0])!.tilemapLayer!

        const findTileAt = (pointer: Input.Pointer): Tile | null => {
            const tilePoint = renderLayer.worldToTileXY(pointer.worldX, pointer.worldY, true)
            if (!tilePoint) {
                return null
            }
            for (const layer of layersReverse) {
                if (INPUT_LAYERS_SKIP.includes(layer.name) || MERGED_RENDER_LAYERS.includes(layer.name)) {
                    continue
                }
                const tile = this.map.getTileAt(tilePoint.x, tilePoint.y, false, layer.name)
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

        // A tap on one of our towns opens (or switches) its ring on the very pointer up this scene
        // then sees, so which ring was open has to be read when the tap went down: only a tap that
        // leaves the same ring open is a tap off it
        let ringAtPress: object | null = null
        const onPointerDown = () => {
            ringAtPress = this.scene.getUIScene().cityRing.getTown()
        }
        this.scene.input.on('pointerdown', onPointerDown)

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
            // On a touch screen there is no Escape: a tap off the muster ring only puts it away. The
            // stack stays selected, so the following tap sends it. A mouse click still moves at once.
            const ring = this.scene.getUIScene().cityRing
            if (
                pointer.wasTouch &&
                ringAtPress &&
                ringAtPress === ring.getTown() &&
                this.scene.getUIScene().dismissRing()
            ) {
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
            this.scene.input.off('pointerdown', onPointerDown)
            this.scene.events.off('pointermove')
        })
    }

    onTilePress(tile: Tile) {
        if (this.selectedTile) {
            this.selectedTile.index -= 1 // Change displayed tile to not selected
            this.scene.syncTileVisual(this.selectedTile)
        }

        this.selectedTile = tile
        this.selectedTile.index += 1 // Update the display tile from the tilemap image
        this.scene.syncTileVisual(this.selectedTile)

        if (tile.index !== TileType.TownSelected) {
            this.scene.getUIScene().onEmptyTileSelected()
        }
    }
}
