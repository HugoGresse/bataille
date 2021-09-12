import { GameMap } from '../model/map/GameMap'
import { updatePlayerIncome } from './updatePlayerIncome'
import { SocketEmitter } from '../SocketEmitter'
import { IncomeDispatcher } from '../model/income/IncomeDispatcher'
import { PlayersById } from '../model/types/PlayersById'
import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { UnitsProcessor } from './UnitsProcessor'
import { UnitState } from '../model/GameState'
import { TilePublic } from '../model/map/Tile'

export class GameUpdateProcessor {
    private players?: AbstractPlayer[]
    private lastUpdatedUnits: UnitState[] = []
    private lastDeletedUnits: UnitState[] = []
    private lastChangedTownsStates: TilePublic[] = []
    private wasFirstUnitSent = false

    private unitsUpdatesRuntimes: Array<number> = []
    private townsUpdatesRuntimes: Array<number> = []
    private countriesUpdatesRuntimes: Array<number> = []

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
        this.lastDeletedUnits = deletedUnits
        this.lastChangedTownsStates = []

        this.unitsUpdatesRuntimes.push(Date.now() - step1)

        // 2. Update towns if needed
        if (this.lastUpdatedUnits.length) {
            // 3. Updates towns
            const step2 = Date.now()
            const { towns, deletedUnits, updatedUnits } = this.unitsProcessor.updateTownsFromUnits(this.map)
            this.lastDeletedUnits.push(...deletedUnits)
            this.lastUpdatedUnits.push(...updatedUnits)
            this.townsUpdatesRuntimes.push(Date.now() - step2)

            // 4. Update country ownership / incomes
            const step3 = Date.now()
            if (towns.length) {
                for (const player of this.players) {
                    updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
                }
                this.lastChangedTownsStates.push(...towns)
            }
            this.countriesUpdatesRuntimes.push(Date.now() - step3)
        } else {
            this.townsUpdatesRuntimes.push(0)
            this.countriesUpdatesRuntimes.push(0)
        }

        this.incomeDispatcher.update(this.players)
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
        const averageStep1 = average(this.unitsUpdatesRuntimes) * 1000
        const averageStep2 = average(this.townsUpdatesRuntimes) * 1000
        const averageStep3 = average(this.countriesUpdatesRuntimes) * 1000

        console.log(`
            uUpd: ${averageStep1}
            tUpd: ${averageStep2}
            cUpd: ${averageStep3}
        `)
    }
}

const average = (arr: Array<number>) => arr.reduce((p, c) => p + c, 0) / arr.length
