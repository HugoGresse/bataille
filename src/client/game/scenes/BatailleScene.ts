import 'phaser'
import {StickUnit} from '../actors/StickUnit'
import {Tilemaps} from 'phaser'
import {BaseScene} from './BaseScene'
import {BatailleGame} from '../BatailleGame'
import {ExportType} from '../../../server/model/types/ExportType'
import {setupCamera} from '../utils/setupCamera'
import {TileSelection} from './TileSelection'

export class BatailleScene extends BaseScene {

    private map!: Tilemaps.Tilemap
    private tileSelectionDetector !: TileSelection

    private units: {
        [id: string]: StickUnit
    } = {}


    constructor() {
        super('BatailleScene')
    }

    preload() {
    }

    create() {
        this.scene.launch("UI")
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
                    console.log("new unit")
                    this.units[unit.id] = new StickUnit(this, unit.id, unit.position.x, unit.position.y)
                }
            })
            const thisUnitsIds = Object.keys(this.units)
            const deadUnits = aliveUnits.filter((obj) => {
                return thisUnitsIds.indexOf(obj) == -1
            })
            if (deadUnits.length > 0) {
                console.log("dead:", deadUnits)
            }
        }
    }

    initSceneWithData(data: ExportType) {
        this.map = this.make.tilemap({ key: "map" });
        const tiles = this.map.addTilesetImage("tile", "tiles");

        data.map.layerNames.forEach(layerName => {
            this.map.createLayer(layerName, tiles);
        })

        this.tileSelectionDetector = new TileSelection(this, this.map)
        this.tileSelectionDetector.start()

        // const xs = Object.keys(data.map).map(Number)
        // const tileWidthHeight = 8
        //
        // xs.forEach(x => {
        //     Object.keys(data.map[x]).map(Number).forEach(y => {
        //         const tileData = data.map[x][y]
        //         new UITile(this, x * tileWidthHeight, y * tileWidthHeight, TERRAIN_GROUND, tileData)
        //     })
        // })

        // From tuto
        // this.map = this.make.tilemap({ key: 'europe', tileWidth: 16, tileHeight: 16 });
        // this.physics.world.setBounds(0, 0, this.borderLayer.width, this.borderLayer.height);
    }

}
