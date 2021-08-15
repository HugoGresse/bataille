"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Map = void 0;
var Tile_1 = require("./Tile");
var map_json_1 = __importDefault(require("../../../../public/assets/tilemaps/json/map.json"));
var xyMapToArray_1 = require("../../utils/xyMapToArray");
var TownsDataLayer_1 = require("./TownsDataLayer");
var EXPORTED_LAYER_NAMES = ["g-water", 'c-ch', 'c-it',
    'c-uk', 'c-is', 'c-gl', 'c-ie',
    'c-fr', 'c-ma', 'c-es', 'c-pt',
    'c-de', 'c-at', 'c-li', 'c-dk',
    'c-be', 'c-nl', 'c-pl', 'c-cz',
    'c-si', 'c-hr', 'c-sk', 'c-hu',
    'c-ba', 'c-me', 'c-rs', 'c-mk',
    'c-al', 'c-bg', 'c-ro', 'c-md',
    'c-ua', 'c-by', 'c-no', 'c-se',
    'c-fi', 'c-ruk', 'c-lt', 'c-lv',
    'c-ee', 'c-sval', 'c-ru', 'c-ge',
    'c-am', 'c-gr', 'c-tr', 'c-sy',
    'c-iq', 'c-ae', 'c-jo', 'c-il',
    'c-lb', 'c-eg', 'c-ly', 'c-tn',
    'c-dz', 'towns',];
var Map = /** @class */ (function () {
    function Map() {
        var _this = this;
        this.tiles = {};
        this.townByCountries = {};
        this.mapWidth = map_json_1.default.width;
        this.mapHeight = map_json_1.default.height;
        for (var x = 0; x < this.mapWidth; x++) {
            this.tiles[x] = {};
            for (var y = 0; y < this.mapHeight; y++) {
                this.tiles[x][y] = new Tile_1.Tile(0);
            }
        }
        var townDataLayer = new TownsDataLayer_1.TownsDataLayer();
        map_json_1.default.layers.forEach(function (layer) {
            if (layer.name.startsWith("c-") || layer.name === "towns") {
                var width = layer.width || 0;
                var height = layer.height || 0;
                if (!layer.data) {
                    return;
                }
                var layerData = null;
                var iter = 0;
                for (var y = 0; y < height; y++) {
                    for (var x = 0; x < width; x++) {
                        layerData = layer.data[iter];
                        if (layerData !== 0) {
                            var tile = new Tile_1.Tile(layerData, townDataLayer.getByCoordinates(x, y));
                            _this.tiles[x][y] = tile;
                            if (tile.isTown) {
                                if (!_this.townByCountries[tile.data.country]) {
                                    _this.townByCountries[tile.data.country] = [];
                                }
                                _this.townByCountries[tile.data.country].push(tile);
                            }
                        }
                        iter++;
                    }
                }
                return;
            }
        });
    }
    Map.prototype.getMapTiles = function () {
        return this.tiles;
    };
    Map.prototype.getTowns = function () {
        var towns = [];
        var tempTile;
        for (var x = 0; x < this.mapWidth; x++) {
            for (var y = 0; y < this.mapHeight; y++) {
                tempTile = this.tiles[x][y];
                if (tempTile.isTown) {
                    towns.push(tempTile);
                }
            }
        }
        return towns;
    };
    Map.prototype.getTownAt = function (x, y) {
        var tile = this.tiles[x][y];
        if (tile.isTown) {
            return tile;
        }
        return null;
    };
    Map.prototype.export = function () {
        var tiles = {};
        for (var x = 0; x < this.mapWidth; x++) {
            tiles[x] = {};
            for (var y = 0; y < this.mapHeight; y++) {
                if (this.tiles[x][y].player) {
                    tiles[x][y] = this.tiles[x][y].export();
                }
            }
        }
        // @ts-ignore
        var countriesPolygons = map_json_1.default.layers
            // @ts-ignore
            .filter(function (layer) { return layer.name.startsWith('c-') && layer.name.endsWith('-o'); })
            // @ts-ignore
            .reduce(function (acc, layer) {
            var country = layer.name.split('-')[1];
            acc[country] = layer.objects.map(function (obj) {
                return {
                    x: obj.x,
                    y: obj.y,
                    polygon: obj.polygon
                };
            });
            return acc;
        }, {});
        return {
            tiles: tiles,
            layerNames: EXPORTED_LAYER_NAMES,
            countries: countriesPolygons
        };
    };
    Map.prototype.getTownsState = function () {
        var outputArray = [];
        xyMapToArray_1.iterateOnXYMap(this.tiles, function (tile, x, y) {
            if (tile.isTown) {
                outputArray.push(tile.export());
            }
        });
        return outputArray;
    };
    Map.prototype.getTownsByCountries = function () {
        return this.townByCountries;
    };
    return Map;
}());
exports.Map = Map;
