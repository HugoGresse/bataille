import 'phaser'
import { StickUnit } from '../../actors/StickUnit'
import { Input, Tilemaps } from 'phaser'
import { BaseScene, SCENE_BATAILLE_KEY, SCENE_UI_KEY } from '../BaseScene'
import { BatailleGame } from '../../BatailleGame'
import { ExportTypeWithGameState } from '../../../../server/model/types/ExportType'
import { setupCamera } from '../../utils/setupCamera'
import { TileSelection } from './TileSelection'
import { Town } from '../../actors/buildings/Town'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { TilesColorsUpdater } from './TilesColorsUpdater'
import { displayCountriesInfo } from './displayCountriesInfo'
import { PathPreview, PathPreviewOrigin } from './PathPreview'
import { SocketConnection } from '../../SocketConnection'
import { PrivateGameStateUpdate, UnitState } from '../../../../server/model/GameState'
import { gridFromWalkability } from '../../../../common/pathfinding/walkabilityGrid'
import { isSameTile, TileCoord } from '../../../../common/pathfinding/findTilePath'
import { round32 } from '../../../../utils/Round32'
import { CaptureWave } from './CaptureWave'
import { toColorNumber } from '../../utils/colors'
import { moveAmountFor } from '../../utils/moveAmount'
import { toLogicalZoom } from '../../utils/renderScale'

const tileKey = ({ x, y }: TileCoord) => `${x},${y}`

/**
 * The map ships as ~58 stacked Tiled layers (water, one per country, relief, towns). Rendering
 * them individually costs a per-frame cull and draw pass each, which dominated the frame budget.
 * The ground layers hold at most one tile per cell, so they flatten into one display layer; the
 * decoration layers (relief, towns) draw over ground with transparency, so they get their own.
 * Input keeps reading the original data layers (they exist without a display object).
 */
export const MERGED_RENDER_LAYERS: string[] = ['render-ground', 'render-decor']
const DECOR_SOURCE_LAYERS = ['g-mountain-forest', 'towns']

/** Upper bound on how much backlog a single frame will chew through */
const MAX_STATES_PER_FRAME = 60

/** How long to keep waiting for a mustered stack to come back from the server before giving up */
const PENDING_SELECTION_MS = 3000

export class BatailleScene extends BaseScene {
    private map!: Tilemaps.Tilemap
    private tileset!: Tilemaps.Tileset
    private groundLayer!: Tilemaps.TilemapLayer
    private decorLayer!: Tilemaps.TilemapLayer
    private groundSources: Tilemaps.LayerData[] = []
    private decorSources: Tilemaps.LayerData[] = []
    private tileSelectionDetector!: TileSelection
    private tilesColorsUpdater!: TilesColorsUpdater

    private units: {
        [id: string]: StickUnit
    } = {}
    private towns: {
        [id: string]: Town
    } = {}
    private townsByTile = new Map<string, Town>()
    private socket!: SocketConnection
    private selectedUnit: StickUnit | null = null
    private pathPreview: PathPreview | null = null
    private captureWave!: CaptureWave
    /** A muster was ordered on this tile: whatever stack turns up there becomes the selection */
    private pendingSelection: { tile: TileCoord; expiresAt: number } | null = null
    /** Previous tick's income, to price a town loss the moment it breaks a country */
    private lastKnownIncome = 0

    constructor() {
        super(SCENE_BATAILLE_KEY)
    }

    preload() {}

    create() {
        this.scene.launch(SCENE_UI_KEY)
        this.input.setTopOnly(false)
        this.captureWave = new CaptureWave(this)
        const game = BatailleGame.getCurrentGame()
        if (game) {
            this.socket = game.getSocket()
        }
        this.events.once('shutdown', () => this.captureWave.destroy())
    }

    update(time: number, delta: number) {
        super.update(time, delta)
        // States are deltas, so they all have to be applied in order. A backgrounded tab stops
        // requestAnimationFrame entirely while the socket keeps queueing, so draining one per frame
        // would take minutes to catch up: work through the backlog, bounded so a huge one cannot
        // stall a single frame.
        for (let applied = 0; applied < MAX_STATES_PER_FRAME; applied++) {
            const newState = this.socket.getStateUpdate()
            if (!newState) {
                break
            }
            this.applyState(newState)
        }
    }

    private applyState(newState: PrivateGameStateUpdate) {
        for (const unit of newState.u.updated) {
            const id = unit.id
            if (this.units[id]) {
                this.units[id].update(unit)
                if (this.selectedUnit?.id === id) {
                    this.onSelectedUnitUpdated(this.selectedUnit)
                }
            } else {
                this.units[id] = this.spawnUnit(unit)
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

        this.resolvePendingSelection()

        const initialState = this.socket.getLatestState()
        if (!initialState) {
            return
        }
        const currentPlayerName = initialState.cp.n
        // A broken country only costs income at the moment it breaks, so the drop is read from the
        // same state that reports the town changing hands
        const income = newState.ps.find((player) => player.n === currentPlayerName)?.i ?? this.lastKnownIncome
        const incomeLost = Math.max(0, this.lastKnownIncome - income)
        this.lastKnownIncome = income

        for (const town of newState.t) {
            const townObject = this.towns[town.id]
            if (!townObject) {
                console.log('invalid town', town.id)
                continue
            }
            const previousOwner = townObject.update(town, currentPlayerName)
            if (previousOwner !== null) {
                const tile = townObject.getTile()
                this.captureWave.play(tile.x, tile.y, toColorNumber(town.p?.c, 0xffffff))
                if (previousOwner === currentPlayerName && town.p?.n !== currentPlayerName) {
                    this.getUIScene().onTownLost({
                        tileX: tile.x,
                        tileY: tile.y,
                        townName: townObject.tileData.n ?? 'A town',
                        incomeLost,
                        color: toColorNumber(town.p?.c, 0xffffff),
                    })
                }
            }
        }
        this.tilesColorsUpdater.update(initialState.ps)
    }

    private spawnUnit(unit: UnitState): StickUnit {
        const counter = new StickUnit(this, unit.id, unit.p.x, unit.p.y)
        counter.setColor(unit.c)
        counter.update(unit)
        counter.applyZoom(toLogicalZoom(this.cameras.main.zoom))
        return counter
    }

    updateAllUnits() {
        const zoom = toLogicalZoom(this.cameras.main.zoom)
        for (const unit of Object.values(this.units)) {
            unit.applyZoom(zoom)
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
    onMoveDestinationSelected(tile: Tilemaps.Tile, worldX: number, worldY: number, pointer?: Input.Pointer) {
        const unit = this.selectedUnit
        if (!unit) {
            return
        }
        if (isSameTile(tile, this.getUnitTile(unit))) {
            this.clearUnitSelection()
            return
        }
        this.actions.moveUnit(unit, worldX, worldY, moveAmountFor(unit.getHPValue(), pointer?.event))
        this.clearUnitSelection()
    }

    /**
     * @param notifyUI when false, the UI scene already knows about the deselection (avoids recursion)
     */
    clearUnitSelection(notifyUI: boolean = true) {
        this.pendingSelection = null
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
        this.pathPreview?.update(this.getPreviewOrigin(this.selectedUnit), { x: tile.x, y: tile.y })
    }

    /**
     * Units raised at a town only exist once the server says so, so the selection waits for the
     * stack to turn up on that tile. A stack already standing there is selected straight away.
     */
    selectStackAt(tile: TileCoord) {
        if (this.trySelectAt(tile)) {
            return
        }
        this.pendingSelection = { tile, expiresAt: this.time.now + PENDING_SELECTION_MS }
    }

    private resolvePendingSelection() {
        const pending = this.pendingSelection
        if (!pending) {
            return
        }
        if (this.time.now > pending.expiresAt || this.trySelectAt(pending.tile)) {
            this.pendingSelection = null
        }
    }

    private trySelectAt(tile: TileCoord): boolean {
        const unit = Object.values(this.units).find(
            (candidate) =>
                isSameTile(this.getUnitTile(candidate), tile) && candidate.isOwnedByCurrentPlayer(this.getState()?.cp.c)
        )
        if (!unit) {
            return false
        }
        if (this.selectedUnit !== unit) {
            this.selectUnit(unit)
        }
        return true
    }

    /** The selected stack moved: keep the path preview anchored to where it now is */
    private onSelectedUnitUpdated(unit: StickUnit) {
        this.pathPreview?.refresh(this.getPreviewOrigin(unit))
    }

    private selectUnit(unit: StickUnit) {
        this.clearUnitSelection(false)
        this.selectedUnit = unit
        unit.onSelect()
        // A stack parked on one of our towns opens that town's muster ring with it
        const town = this.townsByTile.get(tileKey(this.getUnitTile(unit))) ?? null
        this.getUIScene().onUnitSelected(town)
    }

    /** Size of the stack standing on a tile, 0 when it is empty: the muster ring caps against it */
    getStackHPAt(tile: TileCoord): number {
        const unit = Object.values(this.units).find((candidate) => isSameTile(this.getUnitTile(candidate), tile))
        return unit?.getHPValue() ?? 0
    }

    /** Tile the server considers the stack on (same rounding as the server side) */
    private getUnitTile(unit: StickUnit): TileCoord {
        const { x, y } = unit.getServerPosition()
        return { x: round32(x), y: round32(y) }
    }

    private getPreviewOrigin(unit: StickUnit): PathPreviewOrigin {
        return { worldX: unit.x, worldY: unit.y, tile: this.getUnitTile(unit) }
    }

    initSceneWithData(data: ExportTypeWithGameState) {
        this.map = this.make.tilemap({ key: 'map' })
        this.tileset = this.map.addTilesetImage('tile', 'tiles')!
        this.buildMergedRenderLayers(data.map.layerNames)

        const xs = Object.keys(data.map.tiles).map(Number)

        xs.forEach((x) => {
            Object.keys(data.map.tiles[x])
                .map(Number)
                .forEach((y) => {
                    const tileData = data.map.tiles[x][y]
                    if (tileData.isT) {
                        const town = new Town(this, x * TILE_WIDTH_HEIGHT, y * TILE_WIDTH_HEIGHT, tileData)
                        this.towns[town.id] = town
                        this.townsByTile.set(tileKey({ x, y }), town)
                    }
                })
        })

        this.tileSelectionDetector = new TileSelection(this, this.map)
        this.tileSelectionDetector.start()
        this.tilesColorsUpdater = new TilesColorsUpdater(this, data.map.countries)

        // Rebuild the server walkability grid for client-side path previews
        this.pathPreview = new PathPreview(this, gridFromWalkability(data.map.pathfinding))

        setupCamera(this.cameras.main, this, this.map)
        displayCountriesInfo(data.map.countriesInfos, this)

        for (const unit of data.gameState.u.updated) {
            this.units[unit.id] = this.spawnUnit(unit)
        }
        this.tilesColorsUpdater.update(data.gameState.ps)
    }

    private buildMergedRenderLayers(layerNames: string[]) {
        const sources = layerNames
            .map((layerName) => this.map.getLayer(layerName))
            .filter((layer): layer is Tilemaps.LayerData => !!layer)
        this.groundSources = sources.filter((layer) => !DECOR_SOURCE_LAYERS.includes(layer.name))
        this.decorSources = sources.filter((layer) => DECOR_SOURCE_LAYERS.includes(layer.name))

        this.groundLayer = this.buildMergedLayer(MERGED_RENDER_LAYERS[0], this.groundSources)
        this.decorLayer = this.buildMergedLayer(MERGED_RENDER_LAYERS[1], this.decorSources)
    }

    private buildMergedLayer(name: string, sources: Tilemaps.LayerData[]): Tilemaps.TilemapLayer {
        const merged = this.map.createBlankLayer(name, this.tileset)!
        sources.forEach((layer) => {
            layer.data.forEach((row) => {
                row.forEach((tile) => {
                    if (tile.index > 0) {
                        merged.putTileAt(tile.index, tile.x, tile.y, false)
                    }
                })
            })
        })
        return merged
    }

    /**
     * A data-layer tile changed (eg. town or tile selection): repaint that cell of the merged
     * layers from the topmost non-empty data layer of each group.
     */
    syncTileVisual({ x, y }: TileCoord) {
        this.syncMergedCell(this.groundLayer, this.groundSources, x, y)
        this.syncMergedCell(this.decorLayer, this.decorSources, x, y)
    }

    private syncMergedCell(merged: Tilemaps.TilemapLayer, sources: Tilemaps.LayerData[], x: number, y: number) {
        for (let index = sources.length - 1; index >= 0; index--) {
            const tile = sources[index].data[y]?.[x]
            if (tile && tile.index > 0) {
                merged.putTileAt(tile.index, x, y, false)
                return
            }
        }
        merged.removeTileAt(x, y, true, false)
    }
}
