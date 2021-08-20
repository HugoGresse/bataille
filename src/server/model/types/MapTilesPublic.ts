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
}
