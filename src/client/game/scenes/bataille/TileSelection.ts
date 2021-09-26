import { Tilemaps, Input } from 'phaser'
import { BatailleScene } from './BatailleScene'
import { TileType } from '../../../../common/TileType'
import { INPUT_LAYERS_SKIP } from '../../../../server/model/map/EXPORTED_LAYER_NAMES'

type Tile = Tilemaps.Tile

export class TileSelection {
    private selectedTile: Tile | null = null

    constructor(private scene: BatailleScene, private map: Phaser.Tilemaps.Tilemap) {}

    start(): void {
        const layersReverse = [...this.map.layers].reverse()
        this.scene.input.on('pointerup', (pointer: Input.Pointer) => {
            for (const layer of layersReverse) {
                if (INPUT_LAYERS_SKIP.includes(layer.name)) {
                    continue
                }
                const tile = this.map.getTileAtWorldXY(pointer.worldX, pointer.worldY, false, undefined, layer.name)

                if (tile) {
                    this.onTilePress(tile)
                    return
                }
            }
        })
        this.scene.events.on('destroy', () => {
            this.scene.events.off('pointerup')
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
