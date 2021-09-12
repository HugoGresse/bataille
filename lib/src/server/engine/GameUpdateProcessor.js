'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameUpdateProcessor = void 0
var updatePlayerIncome_1 = require('./updatePlayerIncome')
var xyMapToArray_1 = require('../utils/xyMapToArray')
var GameUpdateProcessor = /** @class */ (function () {
    function GameUpdateProcessor(map, playersById, emitter, unitsProcessor, incomeDispatcher) {
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
    GameUpdateProcessor.prototype.run = function () {
        var _a, _b, _c
        if (!this.players) this.players = Object.values(this.playersById)
        // 1. Update units
        var step1 = Date.now()
        var _d = this.unitsProcessor.updateUnits(this.map, this.playersById),
            updatedUnits = _d.updatedUnits,
            deletedUnits = _d.deletedUnits
        this.lastUpdatedUnits = updatedUnits
        this.lastDeletedUnits = deletedUnits
        this.lastChangedTownsStates = []
        this.unitsUpdatesRuntimes.push(Date.now() - step1)
        // 2. Update towns if needed
        if (this.lastUpdatedUnits.length) {
            // 3. Updates towns
            var step2 = Date.now()
            var _e = this.unitsProcessor.updateTownsFromUnits(this.map),
                towns = _e.towns,
                deletedUnits_1 = _e.deletedUnits,
                updatedUnits_1 = _e.updatedUnits
            ;(_a = this.lastDeletedUnits).push.apply(_a, deletedUnits_1)
            ;(_b = this.lastUpdatedUnits).push.apply(_b, updatedUnits_1)
            this.townsUpdatesRuntimes.push(Date.now() - step2)
            // 4. Update country ownership / incomes
            var step3 = Date.now()
            if (towns.length) {
                for (var _i = 0, _f = this.players; _i < _f.length; _i++) {
                    var player = _f[_i]
                    updatePlayerIncome_1.updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
                }
                ;(_c = this.lastChangedTownsStates).push.apply(_c, towns)
            }
            this.countriesUpdatesRuntimes.push(Date.now() - step3)
        } else {
            this.townsUpdatesRuntimes.push(0)
            this.countriesUpdatesRuntimes.push(0)
        }
        this.incomeDispatcher.update(this.players)
    }
    GameUpdateProcessor.prototype.getLastUpdatedUnitsStates = function () {
        if (!this.wasFirstUnitSent) {
            this.wasFirstUnitSent = true
            return xyMapToArray_1
                .xyMapToArray(this.unitsProcessor.getUnits())
                .filter(function (unit) {
                    return !!unit
                })
                .map(function (unit) {
                    return unit.getPublicState()
                })
        }
        return this.lastUpdatedUnits
    }
    GameUpdateProcessor.prototype.getLastDeletedUnitsStates = function () {
        return this.lastDeletedUnits
    }
    GameUpdateProcessor.prototype.getLastTownsStates = function () {
        return this.lastChangedTownsStates
    }
    GameUpdateProcessor.prototype.printRuntimes = function () {
        var averageStep1 = average(this.unitsUpdatesRuntimes) * 1000
        var averageStep2 = average(this.townsUpdatesRuntimes) * 1000
        var averageStep3 = average(this.countriesUpdatesRuntimes) * 1000
        console.log(
            '\n            uUpd: ' +
                averageStep1 +
                '\n            tUpd: ' +
                averageStep2 +
                '\n            cUpd: ' +
                averageStep3 +
                '\n        '
        )
        console.log(
            'dead units (should be empty)',
            xyMapToArray_1.xyMapToArray(this.unitsProcessor.getUnits()).filter(function (unit) {
                return !!unit && unit.life.getHP() <= 0
            })
        )
    }
    return GameUpdateProcessor
})()
exports.GameUpdateProcessor = GameUpdateProcessor
var average = function (arr) {
    return (
        arr.reduce(function (p, c) {
            return p + c
        }, 0) / arr.length
    )
}
