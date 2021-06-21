import {Tilemaps, Input} from 'phaser'
import {BatailleScene} from './BatailleScene'
import {TileNumber} from '../../../common/UNITS'

type Tile = Tilemaps.Tile

export class TileSelection {

    private selectedTile: Tile | null = null

    constructor(private scene: BatailleScene, private map: Phaser.Tilemaps.Tilemap) {
    }

    start(): void {
        this.scene.input.on('pointerup', (pointer: Input.Pointer) => {
            const layersReverse = [...this.map.layers].reverse()
            for (const layer of layersReverse) {
                const tile = this.map.getTileAtWorldXY(
                    pointer.worldX,
                    pointer.worldY,
                    false,
                    undefined,
                    layer.name)

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

        if (tile.index !== TileNumber.Town) {
            this.scene.getUIScene().onEmptyTileSelected()
        }
    }

}
