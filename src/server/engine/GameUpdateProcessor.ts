import { Map } from '../model/map/Map'
import { updatePlayerIncome } from './updatePlayerIncome'
import { SocketEmitter } from '../SocketEmitter'
import { IncomeDispatcher } from '../model/income/IncomeDispatcher'
import { PlayersById } from '../model/types/PlayersById'
import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { UnitsProcessor } from './UnitsProcessor'
import { BaseUnit } from '../model/actors/units/BaseUnit'

export class GameUpdateProcessor {
    private players?: AbstractPlayer[]
    private lastUpdatedUnits: BaseUnit[] = []

    private unitsUpdatesRuntimes: Array<number> = []
    private townsUpdatesRuntimes: Array<number> = []
    private countriesUpdatesRuntimes: Array<number> = []

    constructor(
        private map: Map,
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
        this.lastUpdatedUnits = this.unitsProcessor.updateUnits(this.map, this.playersById)
        // TODO : because units are now grouped in an array, the fight is done only on the next iteration, the first being the unit move: 1. The unit move to a new tile, on next turn, the unit is fighting on this new tile
        this.unitsUpdatesRuntimes.push(Date.now() - step1)

        // 2. Update towns if needed
        if (this.lastUpdatedUnits.length) {
            // 3. Updates towns
            const step2 = Date.now()
            const changedTowns = this.unitsProcessor.updateTownsFromUnits(this.map)
            this.townsUpdatesRuntimes.push(Date.now() - step2)

            // 4. Update country ownership / incomes
            const step3 = Date.now()
            if (changedTowns.length) {
                console.log('town changed')
                for (const player of this.players) {
                    updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
                }
            }
            this.countriesUpdatesRuntimes.push(Date.now() - step3)
        } else {
            this.townsUpdatesRuntimes.push(0)
            console.log('nothing to do')
        }

        this.incomeDispatcher.update(this.players)
    }

    public getLastUpdatedUnits(): BaseUnit[] {
        return this.lastUpdatedUnits
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
