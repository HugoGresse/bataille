import { Tile, TilePublic, Town } from './Tile'
import mapData from '../../../../public/assets/tilemaps/json/map.json'
import { iterateOnXYMap } from '../../utils/xyMapToArray'
import { MapTilesPublic } from '../types/MapTilesPublic'
import { MapTiles } from '../types/MapTiles'
import { TownByCountries } from '../types/TownByCountries'
import { TownsDataLayer } from './TownsDataLayer'
import { PolygonContainer } from '../types/Polygon'
import { RawMapLayerObjectPolygons } from '../types/RawMapLayerObjectPolygons'
import { CountryInfo } from '../types/CountryInfo'
import { RawMapLayerObjectProperties } from '../types/RawMapLayerObjectProperties'

const EXPORTED_LAYER_NAMES = [
    'g-water',
    'c-ch',
    'c-it',
    'c-uk',
    'c-is',
    'c-gl',
    'c-ie',
    'c-fr',
    'c-ma',
    'c-es',
    'c-pt',
    'c-de',
    'c-at',
    'c-li',
    'c-dk',
    'c-be',
    'c-nl',
    'c-pl',
    'c-cz',
    'c-si',
    'c-hr',
    'c-sk',
    'c-hu',
    'c-ba',
    'c-me',
    'c-rs',
    'c-mk',
    'c-al',
    'c-bg',
    'c-ro',
    'c-md',
    'c-ua',
    'c-by',
    'c-no',
    'c-se',
    'c-fi',
    'c-ruk',
    'c-lt',
    'c-lv',
    'c-ee',
    'c-sval',
    'c-ru',
    'c-ge',
    'c-am',
    'c-gr',
    'c-tr',
    'c-sy',
    'c-iq',
    'c-ae',
    'c-jo',
    'c-il',
    'c-lb',
    'c-eg',
    'c-ly',
    'c-tn',
    'c-dz',
    'towns',
]

export class Map {
    private tiles: MapTiles = {}
    private townByCountries: TownByCountries = {}
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

        const townDataLayer = new TownsDataLayer()

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
                            const tile = new Tile(layerData, townDataLayer.getByCoordinates(x, y))
                            this.tiles[x][y] = tile
                            if (tile.isTown) {
                                if (!this.townByCountries[tile.data!.country]) {
                                    this.townByCountries[tile.data!.country] = []
                                }
                                this.townByCountries[tile.data!.country].push(tile as Town)
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
        const towns: Tile[] = []
        let tempTile
        for (let x = 0; x < this.mapWidth; x++) {
            for (let y = 0; y < this.mapHeight; y++) {
                tempTile = this.tiles[x][y]
                if (tempTile.isTown) {
                    towns.push(tempTile)
                }
            }
        }
        return towns
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
                    acc.push({
                        name: name,
                        localName: localName,
                        income: <number>obj.properties.find((property) => property.name === 'income')!.value,
                        x: ~~obj.x,
                        y: ~~obj.y,
                    })
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

    getTownsState(): TilePublic[] {
        const outputArray: TilePublic[] = []
        iterateOnXYMap<Tile>(this.tiles, (tile, x, y) => {
            if (tile.isTown) {
                outputArray.push(tile.export())
            }
        })

        return outputArray
    }

    getTownsByCountries() {
        return this.townByCountries
    }
}
