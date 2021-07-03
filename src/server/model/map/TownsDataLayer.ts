import mapData from '../../../../public/assets/tilemaps/json/map.json'
import {XYMap} from '../../utils/xyMapToArray'
import {Position} from '../actors/Position'
import {TownsData} from '../types/TownsData'

export class TownsDataLayer {

    townsByGrid: XYMap = {}

    constructor() {
        // console.log(mapData.layers.map(layer => layer.name))
        const layer = mapData.layers.find(layer => layer.name === "towns-data")
        if (!layer || !layer.objects) {
            throw new Error('towns-data layer not found in map.json')
        }

        layer.objects.forEach(layerObject => {
            const position = new Position(layerObject.x, layerObject.y - layerObject.height).getRounded()
            if(!this.townsByGrid[position.x] ){
                this.townsByGrid[position.x] = {}
            }
            this.townsByGrid[position.x][position.y] = layerObject
        })
    }
    getByCoordinates(x: number, y: number): TownsData | null {
        if(!this.townsByGrid[x] ||!this.townsByGrid[x][y]){
            return null
        }
        const data = this.townsByGrid[x][y]
        const output = {
            name: "",
            country: ""
        }
        data.properties.forEach((property: {
            name: string,
            value: string
        }) => {
            if(property.name === "name"){
                output.name = property.value
            }
            if(property.name === "country"){
                output.country = property.value
            }
        })
        return output
    }

}

