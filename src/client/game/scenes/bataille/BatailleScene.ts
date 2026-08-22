import 'phaser'
import { StickUnit } from '../../actors/StickUnit'
import { Tilemaps } from 'phaser'
import { Grid } from 'pathfinding'
import { BaseScene, SCENE_BATAILLE_KEY, SCENE_UI_KEY } from '../BaseScene'
import { BatailleGame } from '../../BatailleGame'
import { ExportTypeWithGameState } from '../../../../server/model/types/ExportType'
import { setupCamera } from '../../utils/setupCamera'
import { TileSelection } from './TileSelection'
import { Town } from '../../actors/buildings/Town'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { TilesColorsUpdater } from './TilesColorsUpdater'
import { displayCountriesInfo } from './displayCountriesInfo'
import { PathPreview } from './PathPreview'
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
    private selectedUnit: StickUnit | null = null
    private pathPreview: PathPreview | null = null

    constructor() {
        super(SCENE_BATAILLE_KEY)
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
            for (const unit of newState.u.updated) {
                const id = unit.id
                if (this.units[id]) {
                    this.units[id].update(unit)
                } else {
                    const unitObj = new StickUnit(this, id, unit.p.x, unit.p.y)
                    unitObj.setColor(unit.c)
                    unitObj.update(unit)
                    this.units[id] = unitObj
                }
            }
            for (const unit of newState.u.deleted) {
                const id = unit.id
                if (this.selectedUnit?.id === id) {
                    this.clearUnitSelection()
                }
                if (this.units[id]) {
                    this.units[id].destroy()
                    delete this.units[id]
                }
            }
            const initialState = this.socket.getLatestState()
            if (initialState) {
                const currentPlayerName = initialState.cp.n
                for (const town of newState.t) {
                    if (this.towns[town.id]) {
                        this.towns[town.id].update(town, currentPlayerName)
                    } else {
                        console.log('invalid town', town.id)
                    }
                }
                this.tilesColorsUpdater.update(initialState.ps)
            }
        }
    }

    updateAllUnits() {
        for (const unit of Object.values(this.units)) {
            unit.update()
        }
    }

    /**
     * Step 1 of the move UX: click on one of the current player stacks to select it
     * (click it again, another unit, ESC or ✕ to unselect).
     * @return true when the click was handled (own unit), false to let the tile selection proceed.
     */
    onUnitClicked(unit: StickUnit): boolean {
        if (!unit.isOwnedByCurrentPlayer(this.getState()?.cp.c)) {
            return false
        }
        if (this.selectedUnit === unit) {
            this.clearUnitSelection()
        } else {
            this.selectUnit(unit)
        }
        return true
    }

    isUnitMoveSelectionActive(): boolean {
        return !!this.selectedUnit
    }

    /**
     * Step 2 of the move UX: click a destination tile. Sends the amount picked in the bottom slider.
     * Clicking the origin tile cancels the selection.
     */
    onMoveDestinationSelected(tile: Tilemaps.Tile, worldX: number, worldY: number) {
        const unit = this.selectedUnit
        if (!unit) {
            return
        }
        const unitTileX = Math.floor(unit.x / TILE_WIDTH_HEIGHT)
        const unitTileY = Math.floor(unit.y / TILE_WIDTH_HEIGHT)
        if (tile.x === unitTileX && tile.y === unitTileY) {
            this.clearUnitSelection()
            return
        }
        const amount = this.getUIScene().getUnitMoveAmount()
        this.actions.moveUnit(unit, worldX, worldY, amount)
        this.clearUnitSelection()
    }

    /**
     * @param notifyUI when false, the UI scene already knows about the deselection (avoids recursion)
     */
    clearUnitSelection(notifyUI: boolean = true) {
        this.selectedUnit?.onUnselect()
        this.selectedUnit = null
        this.pathPreview?.clear()
        if (notifyUI) {
            this.getUIScene().onUnitDeselected()
        }
    }

    /**
     * Live A* preview from the selected stack to the hovered tile (same grid + algorithm as the server)
     */
    onPathPreviewHovered(tile: Tilemaps.Tile) {
        if (!this.selectedUnit) {
            return
        }
        this.pathPreview?.update(this.selectedUnit.x, this.selectedUnit.y, { x: tile.x, y: tile.y })
    }

    private selectUnit(unit: StickUnit) {
        this.clearUnitSelection(false)
        this.selectedUnit = unit
        unit.onSelect()
        this.getUIScene().onUnitSelected(unit.id, unit.getHPValue())
    }

    initSceneWithData(data: ExportTypeWithGameState) {
        this.map = this.make.tilemap({ key: 'map' })
        this.tileset = this.map.addTilesetImage('tile', 'tiles')!

        data.map.layerNames.forEach((layerName) => {
            this.map.createLayer(layerName, this.tileset)
        })

        const xs = Object.keys(data.map.tiles).map(Number)

        xs.forEach((x) => {
            Object.keys(data.map.tiles[x])
                .map(Number)
                .forEach((y) => {
                    const tileData = data.map.tiles[x][y]
                    if (tileData.isT) {
                        const town = new Town(this, x * TILE_WIDTH_HEIGHT, y * TILE_WIDTH_HEIGHT, tileData)
                        this.towns[town.id] = town
                    }
                })
        })

        this.tileSelectionDetector = new TileSelection(this, this.map)
        this.tileSelectionDetector.start()
        this.tilesColorsUpdater = new TilesColorsUpdater(this, data.map.countries)

        // Rebuild the server walkability grid for client-side path previews
        const { width, height, columns } = data.map.pathfinding
        const walkabilityMatrix: number[][] = []
        for (let x = 0; x < width; x++) {
            const column: number[] = []
            for (let y = 0; y < height; y++) {
                column.push(columns[x]?.[y] === '1' ? 0 : 1)
            }
            walkabilityMatrix.push(column)
        }
        this.pathPreview = new PathPreview(this, new Grid(walkabilityMatrix))

        setupCamera(this.cameras.main, this, this.map)
        displayCountriesInfo(data.map.countriesInfos, this)

        for (const unit of data.gameState.u.updated) {
            const unitObj = new StickUnit(this, unit.id, unit.p.x, unit.p.y)
            unitObj.setColor(unit.c)
            unitObj.update(unit)
            this.units[unit.id] = unitObj
        }
        this.tilesColorsUpdater.update(data.gameState.ps)
    }
}
