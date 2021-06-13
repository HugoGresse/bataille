import {TilePublic} from '../map/Tile'

export type MapTilesPublic = {
    tiles: {
        [x: number]: {
            [y: number]: TilePublic
        }
    },
    layerNames: string[]
}
