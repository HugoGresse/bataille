'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.UnitsProcessor = void 0
var UNITS_1 = require('../../common/UNITS')
var xyMapToArray_1 = require('../utils/xyMapToArray')
var UnitsProcessor = /** @class */ (function () {
    function UnitsProcessor(units) {
        this.units = units
    }
    /**
     * 1. make unit move
     * 2. If destination is filled, make it fight/merge
     * 3. go to next unit
     */
    UnitsProcessor.prototype.updateUnits = function (map, players) {
        var _this = this
        var updatedUnits = []
        var deletedUnits = []
        Object.values(players).forEach(function (player) {
            return player.setUnitCount(0)
        })
        // 1. Update unit positions
        var unitMoved = false
        xyMapToArray_1.iterateOnXYMap(this.units, function (unit, x, y) {
            if (unit) {
                players[unit.owner.id].incrementUnitCount(unit.life.getHP())
            } else {
                delete _this.units[x][y]
                return
            }
            unitMoved = unit.update(map)
            if (unitMoved) {
                updatedUnits.push(unit.getPublicState())
                var unitNewPos = unit.position.getRounded()
                if (unitNewPos.x != x || unitNewPos.y != y) {
                    // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything
                    delete _this.units[x][y]
                    if (!_this.units[unitNewPos.x]) {
                        _this.units[unitNewPos.x] = {}
                        _this.units[unitNewPos.x][unitNewPos.y] = unit
                        updatedUnits.push(unit.getPublicState())
                    } else if (_this.units[unitNewPos.x][unitNewPos.y]) {
                        // collisions
                        var _a = _this.processUnitsOnSameTile(unit, _this.units[unitNewPos.x][unitNewPos.y]),
                            deadUnits = _a.deadUnits,
                            aliveUnit = _a.aliveUnit
                        deletedUnits.push.apply(
                            deletedUnits,
                            deadUnits.map(function (u) {
                                return u.getPublicState()
                            })
                        )
                        if (aliveUnit) {
                            _this.units[unitNewPos.x][unitNewPos.y] = aliveUnit
                            updatedUnits.push(aliveUnit.getPublicState())
                        } else {
                            delete _this.units[unitNewPos.x][unitNewPos.y]
                        }
                    } else {
                        _this.units[unitNewPos.x][unitNewPos.y] = unit
                        updatedUnits.push(unit.getPublicState())
                    }
                }
            }
        })
        return {
            updatedUnits: updatedUnits,
            deletedUnits: deletedUnits,
        }
    }
    /**
     * Unit fight are done before reaching this, ensuring there should only be the town to conquer
     * @param map
     */
    UnitsProcessor.prototype.updateTownsFromUnits = function (map) {
        var _a
        var towns = map.getTowns()
        var changedTowns = []
        var deletedUnits = []
        var updatedUnits = []
        for (var _i = 0, towns_1 = towns; _i < towns_1.length; _i++) {
            var town = towns_1[_i]
            var unitOnTown = this.units[town.x] ? this.units[town.x][town.y] : null
            if (unitOnTown) {
                if (((_a = town.player) === null || _a === void 0 ? void 0 : _a.id) !== unitOnTown.owner.id) {
                    town.player = unitOnTown.owner
                    changedTowns.push(town.export())
                    unitOnTown.life.takeDamage(1)
                    if (unitOnTown.life.getHP() <= 0) {
                        delete this.units[town.x][town.y]
                        deletedUnits.push(unitOnTown.getPublicState())
                    } else {
                        updatedUnits.push(unitOnTown.getPublicState())
                    }
                }
            }
        }
        return {
            towns: changedTowns,
            deletedUnits: deletedUnits,
            updatedUnits: updatedUnits,
        }
    }
    UnitsProcessor.prototype.getUnits = function () {
        return this.units
    }
    // Actions
    UnitsProcessor.prototype.addUnit = function (unit, player, x, y) {
        if (!this.units[x]) {
            this.units[x] = {}
        }
        if (this.units[x][y]) {
            var existingUnit = this.units[x][y]
            if (existingUnit) {
                if (existingUnit.owner.id === player.id) {
                    if (existingUnit.life.getHP() >= UNITS_1.MAX_UNIT_LIFE) {
                        return null
                    }
                    existingUnit.life.heal(unit.life.getHP())
                    existingUnit.forceUpdate = true
                    return existingUnit
                } else {
                    console.warn('This town does not belong to the user')
                    return null
                }
            }
            return unit
        } else {
            this.units[x][y] = unit
        }
        return unit
    }
    UnitsProcessor.prototype.unitAction = function (player, action) {
        // TODO : rather than getting the unit ID, get the unit position from the frontend, faster and safer
        var unit = xyMapToArray_1.xyMapToArray(this.units).find(function (unit) {
            return unit.id === action.unitId
        })
        if (unit && unit.owner.id === player.id) {
            unit.addAction(action)
        }
    }
    UnitsProcessor.prototype.processUnitsOnSameTile = function (firstUnit, secondUnit) {
        var deadUnits = []
        var alive = null
        if (firstUnit.owner.id === secondUnit.owner.id) {
            // merge units on same player
            firstUnit.life.heal(secondUnit.life.getHP())
            secondUnit.life.setHP(0)
        } else {
            // make units fights
            var firstUnitLife = firstUnit.life.getHP()
            var secondUnitLife = secondUnit.life.getHP()
            firstUnit.life.takeDamage(secondUnit.damage * secondUnitLife)
            secondUnit.life.takeDamage(firstUnit.damage * firstUnitLife)
        }
        if (firstUnit.life.getHP() <= 0) {
            deadUnits.push(firstUnit)
        } else {
            alive = firstUnit
        }
        if (secondUnit.life.getHP() <= 0) {
            deadUnits.push(secondUnit)
        } else {
            if (alive) {
                console.log('alive already??? ')
            }
            alive = secondUnit
        }
        return {
            deadUnits: deadUnits,
            aliveUnit: alive,
        }
    }
    return UnitsProcessor
})()
exports.UnitsProcessor = UnitsProcessor
