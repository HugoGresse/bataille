import { TilePublic } from '../map/Tile'
import { PolygonContainer } from './Polygon'
import { CountryInfo } from './CountryInfo'

export type MapTilesPublic = {
    tiles: {
        [x: number]: {
            [y: number]: TilePublic
        }
    }
    layerNames: string[]
    countries: { [country: string]: PolygonContainer[] }
    countriesInfos: CountryInfo[]
    /**
     * Walkability columns ('1' = walkable) matching the server pathfinding grid,
     * allowing the client to preview paths with the same A* configuration.
     */
    pathfinding: {
        width: number
        height: number
        columns: string[]
    }
}
