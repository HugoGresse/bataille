import 'phaser'
import {StickUnit} from '../actors/StickUnit'
import {Tilemaps} from 'phaser'
import {BaseScene, SCENE_UI_KEY} from './BaseScene'
import {BatailleGame} from '../BatailleGame'
import {ExportType} from '../../../server/model/types/ExportType'
import {setupCamera} from '../utils/setupCamera'
import {TileSelection} from './TileSelection'
import {Town} from '../actors/buildings/Town'
import {TILE_WIDTH_HEIGHT} from '../../../common/UNITS'

export class BatailleScene extends BaseScene {

    private map!: Tilemaps.Tilemap
    private tileset!: Tilemaps.Tileset
    private tileSelectionDetector !: TileSelection

    private units: {
        [id: string]: StickUnit
    } = {}
    private unitGroup!: Phaser.GameObjects.Group
    private towns: {
        [id: string]: Town
    } = {}

    constructor() {
        super('BatailleScene')
    }

    preload() {
        this.unitGroup = this.add.group()
    }

    create() {
        this.scene.launch(SCENE_UI_KEY)
        this.input.setTopOnly(false)
        setupCamera(this.cameras.main, this)
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        const newState = BatailleGame.getCurrentGame().getSocket().getLatestState()
        if (newState) {
            const aliveUnits: string[] = []
            newState.units.forEach(unit => {
                aliveUnits.push(unit.id)
                if (this.units[unit.id]) {
                    this.units[unit.id].update(unit)
                } else {
                    const unitObj = new StickUnit(
                        this,
                        unit.id,
                        unit.position.x,
                        unit.position.y)
                    unitObj.setColor(unit.color)
                    unitObj.update(unit)
                    this.unitGroup.add(unitObj)
                    this.units[unit.id] = unitObj
                }
            })
            const thisUnitsIds = Object.keys(this.units)
            const deadUnits = aliveUnits.filter((obj) => {
                return thisUnitsIds.indexOf(obj) === -1
            })
            if (deadUnits.length > 0) {
                console.log("dead:", deadUnits)
            }

            newState.towns.forEach(town => {
                this.towns[town.id].update(town)
            })
        }
    }

    initSceneWithData(data: ExportType) {
        this.map = this.make.tilemap({key: "map"})
        this.tileset = this.map.addTilesetImage("tile", "tiles")

        data.map.layerNames.forEach(layerName => {
            this.map.createLayer(layerName, this.tileset)
        })

        const xs = Object.keys(data.map.tiles).map(Number)

        xs.forEach(x => {
            Object
                .keys(data.map.tiles[x])
                .map(Number)
                .forEach(y => {
                    const tileData = data.map.tiles[x][y]
                    if (tileData.isTown) {
                        const town = new Town(this, x * TILE_WIDTH_HEIGHT, y * TILE_WIDTH_HEIGHT, tileData)
                        this.towns[town.id] = town
                    }
                })
        })

        this.tileSelectionDetector = new TileSelection(this, this.map)
        this.tileSelectionDetector.start()

    }

}
