import { GameMap } from '../model/map/GameMap'
import { updatePlayerIncome } from './updatePlayerIncome'
import { SocketEmitter } from '../SocketEmitter'
import { IncomeDispatcher } from '../model/income/IncomeDispatcher'
import { PlayersById } from '../model/types/PlayersById'
import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { UnitsProcessor } from './UnitsProcessor'
import { UnitState } from '../model/GameState'
import { TilePublic } from '../model/map/Tile'
import { INCOME_MS } from '../../common/GameSettings'
import { StickUnit } from '../model/actors/units/StickUnit'
import { Position } from '../model/actors/Position'
import { getRandomNumberBetween } from '../../utils/getRandomNumberBetween'
import { TILE_WIDTH_HEIGHT } from '../../common/UNITS'

export class GameUpdateProcessor {
    private players?: AbstractPlayer[]
    private lastUpdatedUnits: UnitState[] = []
    private lastDeletedUnits: UnitState[] = []
    private lastChangedTownsStates: TilePublic[] = []
    private wasFirstUnitSent = false
    /** Changes made between ticks (a surrender), carried into the next broadcast */
    private pendingDeletedUnits: UnitState[] = []
    private pendingChangedTowns: TilePublic[] = []

    // Running averages instead of per-tick sample arrays: the arrays grew unbounded on long games
    private unitsRuntime = { sum: 0, samples: 0 }
    private townsRuntime = { sum: 0, samples: 0 }
    private countriesRuntime = { sum: 0, samples: 0 }

    private recordRuntime(runtime: { sum: number; samples: number }, start: number) {
        runtime.sum += Date.now() - start
        runtime.samples++
    }

    constructor(
        private map: GameMap,
        private playersById: PlayersById,
        private emitter: SocketEmitter,
        private unitsProcessor: UnitsProcessor,
        private incomeDispatcher: IncomeDispatcher
    ) {}

    /**
     * 1. Update unit positions if needed
     * 2. If units moved: detect unit intersections and delete dead ones
     * 3. if units moved: update towns
     * 4. If town changed, update income
     */
    public run() {
        if (!this.players) this.players = Object.values(this.playersById)
        // 1. Update units
        const step1 = Date.now()
        const { updatedUnits, deletedUnits } = this.unitsProcessor.updateUnits(this.map, this.playersById)

        this.lastUpdatedUnits = updatedUnits
        this.lastDeletedUnits = [...this.pendingDeletedUnits, ...deletedUnits]
        this.lastChangedTownsStates = [...this.pendingChangedTowns]
        this.pendingDeletedUnits = []
        this.pendingChangedTowns = []

        this.recordRuntime(this.unitsRuntime, step1)

        // 2. Update towns if needed
        if (this.lastUpdatedUnits.length) {
            // 3. Updates towns
            const step2 = Date.now()
            const { towns, deletedUnits, updatedUnits } = this.unitsProcessor.updateTownsFromUnits(this.map)
            this.lastDeletedUnits.push(...deletedUnits)
            this.lastUpdatedUnits.push(...updatedUnits)
            this.recordRuntime(this.townsRuntime, step2)

            // 4. Update country ownership / incomes
            const step3 = Date.now()
            if (towns.length) {
                for (const player of this.players) {
                    updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
                }
                this.refreshTownCounts()
                this.lastChangedTownsStates.push(...towns)
            }
            this.recordRuntime(this.countriesRuntime, step3)
        }

        if (this.incomeDispatcher.update(this.players)) {
            this.checkOwnedCountryToAddBounty(this.players)
        }
    }

    /** Something changed outside the tick: make sure the next state update carries it */
    public enqueue({ deletedUnits, changedTowns }: { deletedUnits: UnitState[]; changedTowns: TilePublic[] }) {
        this.pendingDeletedUnits.push(...deletedUnits)
        this.pendingChangedTowns.push(...changedTowns)
    }

    /**
     * Tally who holds what, for the victory bar and the standings. Only called when a town actually
     * changed hands, plus once at kick-off for the towns handed out before the loop ever ran.
     */
    public refreshTownCounts() {
        if (!this.players) this.players = Object.values(this.playersById)
        const held = new Map<string, number>()
        for (const town of this.map.getTowns()) {
            const ownerId = town.player?.id
            if (ownerId) {
                held.set(ownerId, (held.get(ownerId) ?? 0) + 1)
            }
        }
        for (const player of this.players) {
            player.setTownCount(held.get(player.id) ?? 0)
        }
    }

    private checkOwnedCountryToAddBounty(players: AbstractPlayer[]) {
        const ts = Date.now() - INCOME_MS
        const townByCountries = this.map.getTownsByCountries()
        for (const player of players) {
            player.getCountriesEligibleForBounty(ts).forEach((countryId) => {
                const town = townByCountries[countryId][getRandomNumberBetween(0, townByCountries[countryId].length)]
                const unit = new StickUnit(
                    player,
                    new Position(
                        town.x * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2,
                        town.y * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
                    )
                )
                this.unitsProcessor.addUnit(unit, player, town.x, town.y)
            })
        }
    }

    public getLastUpdatedUnitsStates(): UnitState[] {
        if (!this.wasFirstUnitSent) {
            this.wasFirstUnitSent = true
            const unitsArrays: UnitState[] = []
            for (const xValues of this.unitsProcessor.getUnits().values()) {
                for (const yValue of xValues.values()) {
                    unitsArrays.push(yValue.getPublicState())
                }
            }
            return unitsArrays
        }
        return this.lastUpdatedUnits
    }
    public getLastDeletedUnitsStates(): UnitState[] {
        return this.lastDeletedUnits
    }
    public getLastTownsStates(): TilePublic[] {
        return this.lastChangedTownsStates
    }

    printRuntimes() {
        const averageOf = (runtime: { sum: number; samples: number }) =>
            runtime.samples === 0 ? 0 : runtime.sum / runtime.samples

        console.log(`
            uUpd: ${averageOf(this.unitsRuntime).toFixed(3)}ms
            tUpd: ${averageOf(this.townsRuntime).toFixed(3)}ms
            cUpd: ${averageOf(this.countriesRuntime).toFixed(3)}ms
        `)
    }
}
