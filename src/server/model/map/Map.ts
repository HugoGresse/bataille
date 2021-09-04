import { Tile, TilePublic, Town } from './Tile'
import mapData from '../../../../public/assets/tilemaps/json/map.json'
import { MapTilesPublic } from '../types/MapTilesPublic'
import { MapTiles } from '../types/MapTiles'
import { TownByCountries } from '../types/TownByCountries'
import { TownsDataLayer } from './TownsDataLayer'
import { PolygonContainer } from '../types/Polygon'
import { RawMapLayerObjectPolygons } from '../types/RawMapLayerObjectPolygons'
import { CountryInfo } from '../types/CountryInfo'
import { RawMapLayerObjectProperties } from '../types/RawMapLayerObjectProperties'
import { COUNTRIES_INCOME } from './COUNTRIES_INCOME'
import { EXPORTED_LAYER_NAMES } from './EXPORTED_LAYER_NAMES'

export const CountryIdToInfo: {
    [name: string]: {
        name: string
        localName: string
        income: number
        neighbours: string[]
    }
} = {}

export class Map {
    private tiles: MapTiles = {}
    private townByCountries: TownByCountries = {}
    private towns: Town[] = []
    private readonly mapWidth: number
    private readonly mapHeight: number

    constructor() {
        // @ts-ignore
        this.mapWidth = mapData.width
        // @ts-ignore
        this.mapHeight = mapData.height

        for (let x = 0; x < this.mapWidth; x++) {
            this.tiles[x] = {}
            for (let y = 0; y < this.mapHeight; y++) {
                this.tiles[x][y] = new Tile(0, null, x, y)
            }
        }

        const townDataLayer = new TownsDataLayer()

        // @ts-ignore
        mapData.layers.forEach((layer: any) => {
            if (EXPORTED_LAYER_NAMES.includes(layer.name)) {
                const width = layer.width || 0
                const height = layer.height || 0
                if (!layer.data) {
                    return
                }
                let layerData = null
                let iter = 0
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        layerData = layer.data[iter]
                        if (layerData !== 0) {
                            const tile = new Tile(layerData, townDataLayer.getByCoordinates(x, y), x, y)
                            this.tiles[x][y] = tile
                            if (tile.isTown) {
                                if (!this.townByCountries[tile.data!.country]) {
                                    this.townByCountries[tile.data!.country] = []
                                }
                                this.townByCountries[tile.data!.country].push(tile as Town)
                                this.towns.push(tile as Town)
                            }
                        }
                        iter++
                    }
                }
                return
            }
        })
    }

    getMapTiles(): MapTiles {
        return this.tiles
    }

    getTowns(): Tile[] {
        return this.towns
    }

    getTownsState(): TilePublic[] {
        return this.towns.map((town) => town.export())
    }

    getTownsByCountries() {
        return this.townByCountries
    }

    getTileAt<T extends Tile>(x: number, y: number): T | null {
        if (!this.tiles[x]) {
            return null
        }
        const tile = this.tiles[x][y]
        return <T>tile
    }

    export(): MapTilesPublic {
        const tiles: MapTilesPublic['tiles'] = {}

        for (let x = 0; x < this.mapWidth; x++) {
            tiles[x] = {}
            for (let y = 0; y < this.mapHeight; y++) {
                if (this.tiles[x][y].player) {
                    tiles[x][y] = this.tiles[x][y].export()
                }
            }
        }
        // @ts-ignore
        const countriesPolygons: { [country: string]: PolygonContainer[] } = <RawMapLayerObjectPolygons[]>mapData.layers
            // @ts-ignore
            .filter((layer) => layer.name.startsWith('c-') && layer.name.endsWith('-o'))
            // @ts-ignore
            .reduce((acc: { [country: string]: PolygonContainer[] }, layer: RawMapLayerObjectPolygons) => {
                const country = layer.name.split('-')[1]
                acc[country] = layer.objects.map((obj: { x: number; y: number; polygon: any[] }) => {
                    return {
                        x: obj.x,
                        y: obj.y,
                        polygon: obj.polygon,
                    }
                })
                return acc
            }, {})

        // @ts-ignore
        const countriesInfo: CountryInfo[] = <RawMapLayerObjectProperties[]>mapData.layers
            // @ts-ignore
            .filter((layer) => layer.name === 'countries-data')
            // @ts-ignore
            .reduce((acc: CountryInfo[], layer: RawMapLayerObjectProperties) => {
                layer.objects.forEach((obj) => {
                    const fullName = <string>obj.properties.find((property) => property.name === 'name')!.value
                    const fullNameSplit = fullName.split('(')
                    const name = fullNameSplit[0]
                    const localName = fullNameSplit[1] ? fullNameSplit[1].replace(')', '') : ''
                    const countryId = <string>obj.properties.find((property) => property.name === 'cid')!.value
                    const neighboursString = <string>(
                        obj.properties.find((property) => property.name === 'neighbours')!.value
                    )
                    const neighbours = neighboursString.split('-')

                    acc.push({
                        name: name,
                        localName: localName,
                        income: COUNTRIES_INCOME[countryId],
                        x: ~~obj.x,
                        y: ~~obj.y,
                    })
                    if (!CountryIdToInfo[countryId]) {
                        CountryIdToInfo[countryId] = {
                            name,
                            localName,
                            income: COUNTRIES_INCOME[countryId],
                            neighbours,
                        }
                    }
                })
                return acc
            }, [])

        return {
            tiles,
            layerNames: EXPORTED_LAYER_NAMES,
            countries: countriesPolygons,
            countriesInfos: countriesInfo,
        }
    }
}
