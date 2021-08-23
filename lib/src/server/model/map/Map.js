'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.Map = exports.CountryIdToInfo = void 0
var Tile_1 = require('./Tile')
var map_json_1 = __importDefault(require('../../../../public/assets/tilemaps/json/map.json'))
var xyMapToArray_1 = require('../../utils/xyMapToArray')
var TownsDataLayer_1 = require('./TownsDataLayer')
var COUNTRIES_INCOME_1 = require('./COUNTRIES_INCOME')
var EXPORTED_LAYER_NAMES_1 = require('./EXPORTED_LAYER_NAMES')
exports.CountryIdToInfo = {}
var Map = /** @class */ (function () {
    function Map() {
        var _this = this
        this.tiles = {}
        this.townByCountries = {}
        // @ts-ignore
        this.mapWidth = map_json_1.default.width
        // @ts-ignore
        this.mapHeight = map_json_1.default.height
        for (var x = 0; x < this.mapWidth; x++) {
            this.tiles[x] = {}
            for (var y = 0; y < this.mapHeight; y++) {
                this.tiles[x][y] = new Tile_1.Tile(0)
            }
        }
        var townDataLayer = new TownsDataLayer_1.TownsDataLayer()
        // @ts-ignore
        map_json_1.default.layers.forEach(function (layer) {
            if (EXPORTED_LAYER_NAMES_1.EXPORTED_LAYER_NAMES.includes(layer.name)) {
                var width = layer.width || 0
                var height = layer.height || 0
                if (!layer.data) {
                    return
                }
                var layerData = null
                var iter = 0
                for (var y = 0; y < height; y++) {
                    for (var x = 0; x < width; x++) {
                        layerData = layer.data[iter]
                        if (layerData !== 0) {
                            var tile = new Tile_1.Tile(layerData, townDataLayer.getByCoordinates(x, y))
                            _this.tiles[x][y] = tile
                            if (tile.isTown) {
                                if (!_this.townByCountries[tile.data.country]) {
                                    _this.townByCountries[tile.data.country] = []
                                }
                                _this.townByCountries[tile.data.country].push(tile)
                            }
                        }
                        iter++
                    }
                }
                return
            }
        })
    }
    Map.prototype.getMapTiles = function () {
        return this.tiles
    }
    Map.prototype.getTowns = function () {
        var towns = []
        var tempTile
        for (var x = 0; x < this.mapWidth; x++) {
            for (var y = 0; y < this.mapHeight; y++) {
                tempTile = this.tiles[x][y]
                if (tempTile.isTown) {
                    towns.push(tempTile)
                }
            }
        }
        return towns
    }
    Map.prototype.getTileAt = function (x, y) {
        if (!this.tiles[x]) {
            return null
        }
        var tile = this.tiles[x][y]
        return tile
    }
    Map.prototype.export = function () {
        var tiles = {}
        for (var x = 0; x < this.mapWidth; x++) {
            tiles[x] = {}
            for (var y = 0; y < this.mapHeight; y++) {
                if (this.tiles[x][y].player) {
                    tiles[x][y] = this.tiles[x][y].export()
                }
            }
        }
        // @ts-ignore
        var countriesPolygons = map_json_1.default.layers
            // @ts-ignore
            .filter(function (layer) {
                return layer.name.startsWith('c-') && layer.name.endsWith('-o')
            })
            // @ts-ignore
            .reduce(function (acc, layer) {
                var country = layer.name.split('-')[1]
                acc[country] = layer.objects.map(function (obj) {
                    return {
                        x: obj.x,
                        y: obj.y,
                        polygon: obj.polygon,
                    }
                })
                return acc
            }, {})
        // @ts-ignore
        var countriesInfo = map_json_1.default.layers
            // @ts-ignore
            .filter(function (layer) {
                return layer.name === 'countries-data'
            })
            // @ts-ignore
            .reduce(function (acc, layer) {
                layer.objects.forEach(function (obj) {
                    var fullName = obj.properties.find(function (property) {
                        return property.name === 'name'
                    }).value
                    var fullNameSplit = fullName.split('(')
                    var name = fullNameSplit[0]
                    var localName = fullNameSplit[1] ? fullNameSplit[1].replace(')', '') : ''
                    var countryId = obj.properties.find(function (property) {
                        return property.name === 'cid'
                    }).value
                    acc.push({
                        name: name,
                        localName: localName,
                        income: COUNTRIES_INCOME_1.COUNTRIES_INCOME[countryId],
                        x: ~~obj.x,
                        y: ~~obj.y,
                    })
                    if (!exports.CountryIdToInfo[countryId]) {
                        exports.CountryIdToInfo[countryId] = {
                            name: name,
                            localName: localName,
                            income: COUNTRIES_INCOME_1.COUNTRIES_INCOME[countryId],
                        }
                    }
                })
                return acc
            }, [])
        return {
            tiles: tiles,
            layerNames: EXPORTED_LAYER_NAMES_1.EXPORTED_LAYER_NAMES,
            countries: countriesPolygons,
            countriesInfos: countriesInfo,
        }
    }
    Map.prototype.getTownsState = function () {
        var outputArray = []
        xyMapToArray_1.iterateOnXYMap(this.tiles, function (tile, x, y) {
            if (tile.isTown) {
                outputArray.push(tile.export())
            }
        })
        return outputArray
    }
    Map.prototype.getTownsByCountries = function () {
        return this.townByCountries
    }
    return Map
})()
exports.Map = Map
