'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.TownsDataLayer = void 0
const map_json_1 = __importDefault(require('../../../../public/assets/tilemaps/json/map.json'))
const Position_1 = require('../actors/Position')
class TownsDataLayer {
    constructor() {
        this.townsByGrid = {}
        // console.log(mapData.layers.map(layer => layer.name))
        // @ts-ignore
        const layer = map_json_1.default.layers.find((layer) => layer.name === 'towns-data')
        if (!layer || !layer.objects) {
            throw new Error('towns-data layer not found in map.json')
        }
        // @ts-ignore
        layer.objects.forEach((layerObject) => {
            const position = new Position_1.Position(layerObject.x, layerObject.y - layerObject.height).getRounded()
            if (!this.townsByGrid[position.x]) {
                this.townsByGrid[position.x] = {}
            }
            this.townsByGrid[position.x][position.y] = layerObject
        })
    }
    getByCoordinates(x, y) {
        if (!this.townsByGrid[x] || !this.townsByGrid[x][y]) {
            return null
        }
        const data = this.townsByGrid[x][y]
        const output = {
            name: '',
            country: '',
        }
        data.properties.forEach((property) => {
            if (property.name === 'name') {
                output.name = property.value
            }
            if (property.name === 'country') {
                output.country = property.value
            }
        })
        return output
    }
}
exports.TownsDataLayer = TownsDataLayer
