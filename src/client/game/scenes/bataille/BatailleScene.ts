import 'phaser'
import { StickUnit } from '../../actors/StickUnit'
import { Tilemaps } from 'phaser'
import { BaseScene, SCENE_UI_KEY } from '../BaseScene'
import { BatailleGame } from '../../BatailleGame'
import { ExportTypeWithGameState } from '../../../../server/model/types/ExportType'
import { setupCamera } from '../../utils/setupCamera'
import { TileSelection } from './TileSelection'
import { Town } from '../../actors/buildings/Town'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { TilesColorsUpdater } from './TilesColorsUpdater'
import { displayCountriesInfo } from './displayCountriesInfo'
import { SocketConnection } from '../../SocketConnection'

export class BatailleScene extends BaseScene {
    private map!: Tilemaps.Tilemap
    private tileset!: Tilemaps.Tileset
    private tileSelectionDetector!: TileSelection
    private tilesColorsUpdater!: TilesColorsUpdater

    private units: {
        [id: string]: StickUnit
    } = {}
    private towns: {
        [id: string]: Town
    } = {}
    private socket!: SocketConnection

    constructor() {
        super('BatailleScene')
    }

    preload() {}

    create() {
        this.scene.launch(SCENE_UI_KEY)
        this.input.setTopOnly(false)
        const game = BatailleGame.getCurrentGame()
        if (game) {
            this.socket = game.getSocket()
        }
    }

    update(time: number, delta: number) {
        super.update(time, delta)
        const newState = this.socket.getStateUpdate()
        if (newState) {
            for (const unit of newState.units.updated) {
                const id = unit.id
                if (this.units[id]) {
                    this.units[id].update(unit)
                } else {
                    const unitObj = new StickUnit(this, id, unit.position.x, unit.position.y)
                    unitObj.setColor(unit.color)
                    unitObj.update(unit)
                    this.units[id] = unitObj
                }
            }
            for (const unit of newState.units.deleted) {
                const id = unit.id
                if (this.units[id]) {
                    this.units[id].destroy()
                    delete this.units[id]
                }
            }
            const initialState = this.socket.getLatestState()
            if (initialState) {
                const currentPlayerName = initialState.cp.name
                for (const town of newState.towns) {
                    if (this.towns[town.id]) {
                        this.towns[town.id].update(town, currentPlayerName)
                    } else {
                        console.log('invalid town', town.id)
                    }
                }
                this.tilesColorsUpdater.update(initialState.players)
            }
        }
    }

    updateAllUnits() {
        for (const unit of Object.values(this.units)) {
            unit.update()
        }
    }

    initSceneWithData(data: ExportTypeWithGameState) {
        this.map = this.make.tilemap({ key: 'map' })
        this.tileset = this.map.addTilesetImage('tile', 'tiles')

        data.map.layerNames.forEach((layerName) => {
            this.map.createLayer(layerName, this.tileset)
        })

        const xs = Object.keys(data.map.tiles).map(Number)

        xs.forEach((x) => {
            Object.keys(data.map.tiles[x])
                .map(Number)
                .forEach((y) => {
                    const tileData = data.map.tiles[x][y]
                    if (tileData.isTown) {
                        const town = new Town(this, x * TILE_WIDTH_HEIGHT, y * TILE_WIDTH_HEIGHT, tileData)
                        this.towns[town.id] = town
                    }
                })
        })

        this.tileSelectionDetector = new TileSelection(this, this.map)
        this.tileSelectionDetector.start()
        this.tilesColorsUpdater = new TilesColorsUpdater(this, data.map.countries)
        setupCamera(this.cameras.main, this, this.map)
        displayCountriesInfo(data.map.countriesInfos, this)

        for (const unit of data.gameState.units.updated) {
            const unitObj = new StickUnit(this, unit.id, unit.position.x, unit.position.y)
            unitObj.setColor(unit.color)
            unitObj.update(unit)
            this.units[unit.id] = unitObj
        }
        this.tilesColorsUpdater.update(data.gameState.players)
    }
}
