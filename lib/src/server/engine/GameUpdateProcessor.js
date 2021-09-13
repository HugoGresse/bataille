'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameUpdateProcessor = void 0
const updatePlayerIncome_1 = require('./updatePlayerIncome')
const GameSettings_1 = require('../../common/GameSettings')
const StickUnit_1 = require('../model/actors/units/StickUnit')
const Position_1 = require('../model/actors/Position')
const getRandomNumberBetween_1 = require('../../utils/getRandomNumberBetween')
const UNITS_1 = require('../../common/UNITS')
class GameUpdateProcessor {
    constructor(map, playersById, emitter, unitsProcessor, incomeDispatcher) {
        this.map = map
        this.playersById = playersById
        this.emitter = emitter
        this.unitsProcessor = unitsProcessor
        this.incomeDispatcher = incomeDispatcher
        this.lastUpdatedUnits = []
        this.lastDeletedUnits = []
        this.lastChangedTownsStates = []
        this.wasFirstUnitSent = false
        this.unitsUpdatesRuntimes = []
        this.townsUpdatesRuntimes = []
        this.countriesUpdatesRuntimes = []
    }
    /**
     * 1. Update unit positions if needed
     * 2. If units moved: detect unit intersections and delete dead ones
     * 3. if units moved: update towns
     * 4. If town changed, update income
     */
    run() {
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
                    updatePlayerIncome_1.updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
                }
                this.lastChangedTownsStates.push(...towns)
            }
            this.countriesUpdatesRuntimes.push(Date.now() - step3)
        } else {
            this.townsUpdatesRuntimes.push(0)
            this.countriesUpdatesRuntimes.push(0)
        }
        if (this.incomeDispatcher.update(this.players)) {
            this.checkOwnedCountryToAddBounty(this.players)
        }
    }
    checkOwnedCountryToAddBounty(players) {
        const ts = Date.now() - GameSettings_1.INCOME_MS
        const townByCountries = this.map.getTownsByCountries()
        for (const player of players) {
            player.getCountriesEligibleForBounty(ts).forEach((countryId) => {
                const town =
                    townByCountries[countryId][
                        getRandomNumberBetween_1.getRandomNumberBetween(0, townByCountries[countryId].length)
                    ]
                const unit = new StickUnit_1.StickUnit(
                    player,
                    new Position_1.Position(
                        town.x * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2,
                        town.y * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2
                    )
                )
                this.unitsProcessor.addUnit(unit, player, town.x, town.y)
            })
        }
    }
    getLastUpdatedUnitsStates() {
        if (!this.wasFirstUnitSent) {
            this.wasFirstUnitSent = true
            const unitsArrays = []
            for (const xValues of this.unitsProcessor.getUnits().values()) {
                for (const yValue of xValues.values()) {
                    unitsArrays.push(yValue.getPublicState())
                }
            }
            return unitsArrays
        }
        return this.lastUpdatedUnits
    }
    getLastDeletedUnitsStates() {
        return this.lastDeletedUnits
    }
    getLastTownsStates() {
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
exports.GameUpdateProcessor = GameUpdateProcessor
const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length
