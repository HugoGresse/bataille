'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.TownsDataLayer = void 0
var map_json_1 = __importDefault(require('../../../../public/assets/tilemaps/json/map.json'))
var Position_1 = require('../actors/Position')
var TownsDataLayer = /** @class */ (function () {
    function TownsDataLayer() {
        var _this = this
        this.townsByGrid = {}
        // console.log(mapData.layers.map(layer => layer.name))
        // @ts-ignore
        var layer = map_json_1.default.layers.find(function (layer) {
            return layer.name === 'towns-data'
        })
        if (!layer || !layer.objects) {
            throw new Error('towns-data layer not found in map.json')
        }
        // @ts-ignore
        layer.objects.forEach(function (layerObject) {
            var position = new Position_1.Position(layerObject.x, layerObject.y - layerObject.height).getRounded()
            if (!_this.townsByGrid[position.x]) {
                _this.townsByGrid[position.x] = {}
            }
            _this.townsByGrid[position.x][position.y] = layerObject
        })
    }
    TownsDataLayer.prototype.getByCoordinates = function (x, y) {
        if (!this.townsByGrid[x] || !this.townsByGrid[x][y]) {
            return null
        }
        var data = this.townsByGrid[x][y]
        var output = {
            name: '',
            country: '',
        }
        data.properties.forEach(function (property) {
            if (property.name === 'name') {
                output.name = property.value
            }
            if (property.name === 'country') {
                output.country = property.value
            }
        })
        return output
    }
    return TownsDataLayer
})()
exports.TownsDataLayer = TownsDataLayer
