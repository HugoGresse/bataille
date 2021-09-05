'use strict'
var __extends =
    (this && this.__extends) ||
    (function () {
        var extendStatics = function (d, b) {
            extendStatics =
                Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array &&
                    function (d, b) {
                        d.__proto__ = b
                    }) ||
                function (d, b) {
                    for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]
                }
            return extendStatics(d, b)
        }
        return function (d, b) {
            if (typeof b !== 'function' && b !== null)
                throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null')
            extendStatics(d, b)
            function __() {
                this.constructor = d
            }
            d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __())
        }
    })()
Object.defineProperty(exports, '__esModule', { value: true })
exports.IAPlayer = void 0
var AbstractPlayer_1 = require('./AbstractPlayer')
var Map_1 = require('../map/Map')
var NeutralPlayer_1 = require('./NeutralPlayer')
var UnitAction_1 = require('../../../common/UnitAction')
var Position_1 = require('../actors/Position')
var createUnitMaps_1 = require('../../engine/utils/createUnitMaps')
var UNITS_1 = require('../../../common/UNITS')
var getRandomNumberBetween_1 = require('../../../utils/getRandomNumberBetween')
var IA_UPDATE_INTERVAL = 1000 // ms
var MAX_ACTION_UPDATE = 5
var IAPlayer = /** @class */ (function (_super) {
    __extends(IAPlayer, _super)
    function IAPlayer(color, name) {
        var _this = _super.call(this, name, color) || this
        _this.lastRunTime = 0
        _this.actionByCountries = {}
        _this.countriesToRecapture = []
        _this.actionByUpdate = 0
        return _this
    }
    IAPlayer.prototype.setActionsProcessor = function (actionsProcessor) {
        this.actionsProcessor = actionsProcessor
    }
    IAPlayer.prototype.update = function (map, players) {
        _super.prototype.update.call(this, map, players)
        if (
            this.lastRunTime + IA_UPDATE_INTERVAL + getRandomNumberBetween_1.getRandomNumberBetween(500, 3000) >=
            Date.now()
        ) {
            return
        }
        this.lastRunTime = Date.now()
        if ((this.money > 0 && this.unitCount === 0) || this.isDead) {
            return
        }
        this.actionByUpdate = 0
        var unitsMaps = createUnitMaps_1.createUnitMaps(players)
        var currentCountriesAllOwned = this.checkCurrentCountries(map, unitsMaps)
        if (currentCountriesAllOwned) {
            if (this.countriesToRecapture.length > 0) {
                // console.log("capturing lost country")
                // Not used currently
            }
            this.captureNeighboursCountries(map, unitsMaps)
        }
    }
    IAPlayer.prototype.updateIncome = function (ownedCountriesIds, emitter) {
        var lostCountries = []
        if (ownedCountriesIds) {
            lostCountries = this.ownedCountriesIds.filter(function (id) {
                return !ownedCountriesIds.includes(id)
            })
        }
        _super.prototype.updateIncome.call(this, ownedCountriesIds, emitter)
        if (lostCountries.length) {
            for (var _i = 0, lostCountries_1 = lostCountries; _i < lostCountries_1.length; _i++) {
                var id = lostCountries_1[_i]
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
    IAPlayer.prototype.checkCurrentCountries = function (map, unitsMaps) {
        var _this = this
        var townByCountries = map.getTownsByCountries()
        var nothingToDo = true
        Object.keys(townByCountries).forEach(function (countryId) {
            var ownAllTheTowns = true
            var fromTown = null
            var townToCapture = null
            if (_this.money <= 0) {
                nothingToDo = false
                return nothingToDo
            }
            for (var _i = 0, _a = townByCountries[countryId]; _i < _a.length; _i++) {
                var town = _a[_i]
                if (town.player.id === _this.id) {
                    fromTown = town
                } else if (town.player.id !== _this.id || _this instanceof NeutralPlayer_1.NeutralPlayer) {
                    ownAllTheTowns = false
                    townToCapture = town
                }
                if (!ownAllTheTowns) {
                    if (fromTown) {
                        break
                    }
                }
            }
            if (townToCapture && fromTown) {
                var unitSent = _this.sendUnit(fromTown, townToCapture, unitsMaps)
                _this.actionByCountries[countryId] = townToCapture.id
                if (unitSent) {
                    // console.log("take empty country")
                }
                nothingToDo = false
            } else if (ownAllTheTowns && _this.actionByCountries[countryId]) {
                // country owned fully
                // console.log("Country owned", countryId)
                delete _this.actionByCountries[countryId]
            }
        })
        return nothingToDo
    }
    IAPlayer.prototype.captureNeighboursCountries = function (map, unitsMaps) {
        var _this = this
        this.ownedCountriesIds.forEach(function (countryId) {
            var neighbours = Map_1.CountryIdToInfo[countryId].neighbours
            for (var _i = 0, neighbours_1 = neighbours; _i < neighbours_1.length; _i++) {
                var neighboursCountryId = neighbours_1[_i]
                if (!_this.ownedCountriesIds.includes(neighboursCountryId) && _this.money > 10) {
                    // This country is not owned by the player
                    var townToCapture = map.getTownsByCountries()[neighboursCountryId][0]
                    var countryTowns = map.getTownsByCountries()[countryId]
                    var fromTown =
                        countryTowns[getRandomNumberBetween_1.getRandomNumberBetween(0, countryTowns.length - 1)]
                    var unitSent = _this.sendUnit(fromTown, townToCapture, unitsMaps)
                    if (unitSent) {
                        // console.log('capturing ', neighboursCountryId, fromTown.data)
                    }
                    break
                }
            }
        })
    }
    IAPlayer.prototype.sendUnit = function (from, to, unitsMap) {
        if (this.actionByUpdate > MAX_ACTION_UPDATE) {
            // console.log("max out")
            return false
        }
        var enemyUnit
        if (unitsMap[to.x] && unitsMap[to.x][to.y]) {
            enemyUnit = unitsMap[to.x][to.y][0]
        }
        var unitCountToCreate = this.getUnitCountToSend(enemyUnit)
        var startX = from.x * UNITS_1.TILE_WIDTH_HEIGHT + 2
        var startY = from.y * UNITS_1.TILE_WIDTH_HEIGHT + 2
        var createdUnit = this.actionsProcessor.addUnit(this, {
            x: startX,
            y: startY,
        })
        for (var i = 1; i < unitCountToCreate; i++) {
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
    IAPlayer.prototype.getUnitCountToSend = function (enemyUnit) {
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
    return IAPlayer
})(AbstractPlayer_1.AbstractPlayer)
exports.IAPlayer = IAPlayer
