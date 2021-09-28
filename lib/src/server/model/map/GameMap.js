'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameMap = exports.CountryIdToInfo = void 0
const Tile_1 = require('./Tile')
const map_json_1 = __importDefault(require('../../../../public/assets/tilemaps/json/map.json'))
const TownsDataLayer_1 = require('./TownsDataLayer')
const COUNTRIES_INCOME_1 = require('./COUNTRIES_INCOME')
const EXPORTED_LAYER_NAMES_1 = require('./EXPORTED_LAYER_NAMES')
const generateGrid_1 = require('./pathfinding/generateGrid')
exports.CountryIdToInfo = {}
class GameMap {
    constructor() {
        this.tiles = {}
        this.townByCountries = {}
        this.towns = []
        // @ts-ignore
        this.mapWidth = map_json_1.default.width
        // @ts-ignore
        this.mapHeight = map_json_1.default.height
        for (let x = 0; x < this.mapWidth; x++) {
            this.tiles[x] = {}
            for (let y = 0; y < this.mapHeight; y++) {
                this.tiles[x][y] = new Tile_1.Tile(0, null, x, y)
            }
        }
        const townDataLayer = new TownsDataLayer_1.TownsDataLayer()
        // @ts-ignore
        map_json_1.default.layers.forEach((layer) => {
            if (EXPORTED_LAYER_NAMES_1.EXPORTED_LAYER_NAMES.includes(layer.name)) {
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
                            const tile = new Tile_1.Tile(layerData, townDataLayer.getByCoordinates(x, y), x, y)
                            this.tiles[x][y] = tile
                            if (tile.isTown) {
                                if (!this.townByCountries[tile.data.country]) {
                                    this.townByCountries[tile.data.country] = []
                                }
                                this.townByCountries[tile.data.country].push(tile)
                                this.towns.push(tile)
                            }
                        }
                        iter++
                    }
                }
                return
            }
        })
        this.pathFindingGrid = generateGrid_1.generateGrid(this.tiles, this.mapWidth, this.mapHeight)
    }
    getMapTiles() {
        return this.tiles
    }
    getTowns() {
        return this.towns
    }
    getTownsByCountries() {
        return this.townByCountries
    }
    getTileAt(x, y) {
        if (!this.tiles[x]) {
            return null
        }
        const tile = this.tiles[x][y]
        return tile
    }
    export() {
        const tiles = {}
        for (let x = 0; x < this.mapWidth; x++) {
            tiles[x] = {}
            for (let y = 0; y < this.mapHeight; y++) {
                if (this.tiles[x][y].player) {
                    tiles[x][y] = this.tiles[x][y].export()
                }
            }
        }
        // @ts-ignore
        const countriesPolygons = map_json_1.default.layers
            // @ts-ignore
            .filter((layer) => layer.name.startsWith('c-') && layer.name.endsWith('-o'))
            // @ts-ignore
            .reduce((acc, layer) => {
                const country = layer.name.split('-')[1]
                acc[country] = layer.objects.map((obj) => {
                    return {
                        x: obj.x,
                        y: obj.y,
                        polygon: obj.polygon,
                    }
                })
                return acc
            }, {})
        // @ts-ignore
        const countriesInfo = map_json_1.default.layers
            // @ts-ignore
            .filter((layer) => layer.name === 'countries-data')
            // @ts-ignore
            .reduce((acc, layer) => {
                layer.objects.forEach((obj) => {
                    const fullName = obj.properties.find((property) => property.name === 'name').value
                    const fullNameSplit = fullName.split('(')
                    const name = fullNameSplit[0]
                    const localName = fullNameSplit[1] ? fullNameSplit[1].replace(')', '') : ''
                    const countryId = obj.properties.find((property) => property.name === 'cid').value
                    const neighboursString = obj.properties.find((property) => property.name === 'neighbours').value
                    const neighbours = neighboursString.split('-')
                    acc.push({
                        name: name,
                        localName: localName,
                        income: COUNTRIES_INCOME_1.COUNTRIES_INCOME[countryId],
                        x: ~~obj.x,
                        y: ~~obj.y,
                    })
                    if (!exports.CountryIdToInfo[countryId]) {
                        exports.CountryIdToInfo[countryId] = {
                            name,
                            localName,
                            income: COUNTRIES_INCOME_1.COUNTRIES_INCOME[countryId],
                            neighbours,
                        }
                    }
                })
                return acc
            }, [])
        return {
            tiles,
            layerNames: EXPORTED_LAYER_NAMES_1.EXPORTED_LAYER_NAMES,
            countries: countriesPolygons,
            countriesInfos: countriesInfo,
        }
    }
}
exports.GameMap = GameMap
