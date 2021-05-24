import {Tile, TilePublic} from './Tile'
import mapData from '../../../../public/assets/tilemaps/json/map.json'

export type MapTiles = {
    [x: number]: {
        [y: number]: Tile
    }
}
export type MapTilesPublic = {
    tiles: {
        [x: number]: {
            [y: number]: TilePublic
        }
    },
    layerNames: string[]
}

const EXPORTED_LAYER_NAMES= ["g-water", 'c-fr', 'c-it','c-es','c-pt','c-uk','c-ie', 'c-ch', 'c-ma', 'towns', ]

export class Map {
    private tiles: MapTiles = {}
    private mapWidth: number
    private mapHeight: number

    constructor() {
        this.mapWidth = mapData.width
        this.mapHeight = mapData.height

        for (let x = 0; x < this.mapWidth; x++) {
            this.tiles[x] = {}
            for (let y = 0; y < this.mapHeight; y++) {
                this.tiles[x][y] = new Tile(0)
            }
        }


        mapData.layers.forEach(layer => {
            if (layer.name.startsWith("c-")) {
                const width = layer.width || 0
                const height = layer.height || 0
                if (!layer.data) {
                    return
                }
                let layerData = null
                let iter= 0
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        layerData = layer.data[iter]
                        if (layerData !== 0) {
                            // console.log(layerData)
                            this.tiles[x][y] = new Tile(layerData)
                        }
                        iter++
                    }
                }
                return
            }
        })
    }

    export(): MapTilesPublic {
        const tiles: MapTilesPublic["tiles"] = {}

        for (let x = 0; x < this.mapWidth; x++) {
            tiles[x] = {}
            for (let y = 0; y < this.mapHeight; y++) {
                tiles[x][y] = this.tiles[x][y].export()
            }
        }

        return {
            tiles,
            layerNames: EXPORTED_LAYER_NAMES
        }
    }


}
