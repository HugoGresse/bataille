import { TilePublic } from '../map/Tile'
import { PolygonContainer } from './Polygon'
import { CountryInfo } from './CountryInfo'
import { WalkabilitySnapshot } from '../../../common/pathfinding/walkabilityGrid'

export type MapTilesPublic = {
    tiles: {
        [x: number]: {
            [y: number]: TilePublic
        }
    }
    layerNames: string[]
    countries: { [country: string]: PolygonContainer[] }
    countriesInfos: CountryInfo[]
    /** Server pathfinding grid snapshot, allowing the client to preview paths with the same A* */
    pathfinding: WalkabilitySnapshot
}
