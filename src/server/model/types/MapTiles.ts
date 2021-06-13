import {Tile} from '../map/Tile'

export type MapTiles = {
    [x: number]: {
        [y: number]: Tile
    }
}
