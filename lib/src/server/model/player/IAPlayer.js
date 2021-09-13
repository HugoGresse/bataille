'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.IAPlayer = void 0
const AbstractPlayer_1 = require('./AbstractPlayer')
const GameMap_1 = require('../map/GameMap')
const NeutralPlayer_1 = require('./NeutralPlayer')
const UnitAction_1 = require('../../../common/UnitAction')
const Position_1 = require('../actors/Position')
const UNITS_1 = require('../../../common/UNITS')
const getRandomNumberBetween_1 = require('../../../utils/getRandomNumberBetween')
const GameSettings_1 = require('../../../common/GameSettings')
class IAPlayer extends AbstractPlayer_1.AbstractPlayer {
    constructor(color, name) {
        super(name, color)
        this.lastRunTime = 0
        this.actionByCountries = {}
        this.countriesToRecapture = []
        this.actionByUpdate = 0
        this.updateDelay = getRandomNumberBetween_1.getRandomNumberBetween(
            GameSettings_1.IASettings.randomMin,
            GameSettings_1.IASettings.randomMax
        )
    }
    setProcessor(actionsProcessor, unitsProcessor) {
        this.actionsProcessor = actionsProcessor
        this.unitsProcessor = unitsProcessor
    }
    update(map, units) {
        super.update(map, units)
        if (this.lastRunTime === 0) {
            // Game starting
            this.lastRunTime =
                Date.now() +
                GameSettings_1.IASettings.updateInterval +
                getRandomNumberBetween_1.getRandomNumberBetween(
                    GameSettings_1.IASettings.randomMin,
                    GameSettings_1.IASettings.randomMax
                )
            return
        }
        if (this.lastRunTime + GameSettings_1.IASettings.updateInterval + this.updateDelay >= Date.now()) {
            return
        }
        this.lastRunTime = Date.now()
        this.updateDelay = getRandomNumberBetween_1.getRandomNumberBetween(
            GameSettings_1.IASettings.randomMin,
            GameSettings_1.IASettings.randomMax
        )
        if ((this.money > 0 && this.unitCount === 0) || this.isDead) {
            return
        }
        this.actionByUpdate = 0
        const currentCountriesAllOwned = this.checkCurrentCountries(map, units)
        if (currentCountriesAllOwned) {
            if (this.countriesToRecapture.length > 0) {
                // console.log("capturing lost country")
                // Not used currently
            }
            this.captureNeighboursCountries(map, units)
        }
        return
    }
    updateIncome(ownedCountriesIds, emitter) {
        let lostCountries = []
        if (ownedCountriesIds) {
            lostCountries = this.ownedCountriesIds.filter((id) => !ownedCountriesIds.includes(id))
        }
        super.updateIncome(ownedCountriesIds, emitter)
        if (lostCountries.length) {
            for (const id of lostCountries) {
                if (!this.actionByCountries[id] && !this.countriesToRecapture.includes(id)) {
                    this.countriesToRecapture.push(id)
                }
            }
        }
    }
    /**
     * 1. Try to finish capturing country the IA has town in
     *      // 1. Check if country contain one not current player town and one current player town
     *      // 2. if so, send unit to take the next town, on every update
     */
    checkCurrentCountries(map, unitsMaps) {
        const townByCountries = map.getTownsByCountries()
        let nothingToDo = true
        Object.keys(townByCountries).forEach((countryId) => {
            let ownAllTheTowns = true
            let townToCapture = null
            if (this.money <= 0) {
                nothingToDo = false
                return nothingToDo
            }
            const fromTowns = []
            for (const town of townByCountries[countryId]) {
                if (town.player.id === this.id) {
                    fromTowns.push(town)
                } else if (town.player.id !== this.id || this instanceof NeutralPlayer_1.NeutralPlayer) {
                    ownAllTheTowns = false
                    townToCapture = town
                }
                if (!ownAllTheTowns) {
                    if (fromTowns.length) {
                        break
                    }
                }
            }
            if (townToCapture && fromTowns.length) {
                const unitSent = this.sendUnit(
                    fromTowns[getRandomNumberBetween_1.getRandomNumberBetween(0, fromTowns.length)],
                    townToCapture,
                    unitsMaps
                )
                this.actionByCountries[countryId] = townToCapture.id
                if (unitSent) {
                    // console.log("take empty country")
                }
                nothingToDo = false
            } else if (ownAllTheTowns && this.actionByCountries[countryId]) {
                // country owned fully
                // console.log("Country owned", countryId)
                delete this.actionByCountries[countryId]
            }
        })
        return nothingToDo
    }
    captureNeighboursCountries(map, unitsMaps) {
        this.ownedCountriesIds.forEach((countryId) => {
            const neighbours = GameMap_1.CountryIdToInfo[countryId].neighbours
            for (const neighboursCountryId of neighbours) {
                if (!this.ownedCountriesIds.includes(neighboursCountryId) && this.money > 10) {
                    // This country is not owned by the player
                    const townToCapture = map.getTownsByCountries()[neighboursCountryId][0]
                    const countryTowns = map.getTownsByCountries()[countryId]
                    const fromTown =
                        countryTowns[getRandomNumberBetween_1.getRandomNumberBetween(0, countryTowns.length - 1)]
                    const unitSent = this.sendUnit(fromTown, townToCapture, unitsMaps)
                    if (unitSent) {
                        // console.log('capturing ', neighboursCountryId, fromTown.data)
                    }
                    break
                }
            }
        })
    }
    sendUnit(from, to, unitsMap) {
        var _a
        if (this.actionByUpdate > GameSettings_1.IASettings.maxActionsByRun) {
            return false
        }
        const enemyUnit = (_a = unitsMap.get(to.x)) === null || _a === void 0 ? void 0 : _a.get(to.y)
        const unitCountToCreate = this.getUnitCountToSend(enemyUnit)
        const startX = from.x * UNITS_1.TILE_WIDTH_HEIGHT + 2
        const startY = from.y * UNITS_1.TILE_WIDTH_HEIGHT + 2
        const createdUnit = this.actionsProcessor.addUnit(this, {
            x: startX,
            y: startY,
        })
        for (let i = 1; i < unitCountToCreate; i++) {
            this.actionsProcessor.addUnit(this, {
                x: startX,
                y: startY,
            })
        }
        if (createdUnit) {
            this.actionByUpdate++
            // console.log("move unit to dest", to.data)
            this.actionsProcessor.unitEvent(
                this,
                new UnitAction_1.UnitAction(
                    createdUnit.id,
                    UnitAction_1.UnitActionType.Move,
                    new UnitAction_1.UnitActionMoveData(
                        new Position_1.Position(
                            to.x * UNITS_1.TILE_WIDTH_HEIGHT + 10,
                            to.y * UNITS_1.TILE_WIDTH_HEIGHT + 10
                        )
                    )
                )
            )
            return true
        }
        return false
    }
    getUnitCountToSend(enemyUnit) {
        if (enemyUnit) {
            if (this.money > 100) {
                return enemyUnit.life.getHP()
            }
            return ~~(enemyUnit.life.getHP() / 2)
        }
        if (this.money > 100) {
            return getRandomNumberBetween_1.getRandomNumberBetween(1, 5)
        }
        return 1
    }
}
exports.IAPlayer = IAPlayer
