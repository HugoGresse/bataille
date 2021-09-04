'use strict'
var __assign =
    (this && this.__assign) ||
    function () {
        __assign =
            Object.assign ||
            function (t) {
                for (var s, i = 1, n = arguments.length; i < n; i++) {
                    s = arguments[i]
                    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
                }
                return t
            }
        return __assign.apply(this, arguments)
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.AbstractPlayer = void 0
var GameSettings_1 = require('../../../common/GameSettings')
var uuid_1 = require('uuid')
var UNITS_1 = require('../../../common/UNITS')
var xyMapToArray_1 = require('../../utils/xyMapToArray')
var COUNTRIES_INCOME_1 = require('../map/COUNTRIES_INCOME')
var AbstractPlayer = /** @class */ (function () {
    function AbstractPlayer(name, color) {
        if (name === void 0) {
            name = '' + Date.now()
        }
        this.color = color
        this._name = '' + Date.now()
        this.units = {}
        this.unitCount = 0
        this.income = 2
        this.money = GameSettings_1.MONEY_START
        this.isConnected = true
        this.isDead = false
        this.ownedCountriesIds = []
        this.id = uuid_1.v4()
        this.name = name
    }
    Object.defineProperty(AbstractPlayer.prototype, 'name', {
        get: function () {
            return this._name
        },
        set: function (name) {
            this._name = name.trim()
        },
        enumerable: false,
        configurable: true,
    })
    AbstractPlayer.prototype.setConnected = function (isConnected) {
        this.isConnected = isConnected
    }
    AbstractPlayer.prototype.addUnit = function (unit, x, y) {
        if (!this.units[x]) {
            this.units[x] = {}
        }
        if (this.units[x][y]) {
            var existingUnit = this.units[x][y]
            if (existingUnit.life.getHP() >= UNITS_1.MAX_UNIT_LIFE) {
                return null
            }
            existingUnit.life.setHP(existingUnit.life.getHP() + unit.life.getHP())
        } else {
            this.units[x][y] = unit
        }
        return this.units[x][y]
    }
    AbstractPlayer.prototype.getUnits = function () {
        return this.units
    }
    AbstractPlayer.prototype.getUnitsState = function () {
        var _this = this
        return xyMapToArray_1.xyMapToArray(this.units).map(function (unit) {
            return {
                id: unit.id,
                type: unit.type,
                hp: unit.life.get(),
                position: unit.position.get(),
                color: _this.color.replace('0x', '#'),
            }
        })
    }
    AbstractPlayer.prototype.getPublicPlayerState = function () {
        return {
            name: this.name,
            income: this.income,
            color: this.color,
            countries: this.ownedCountriesIds,
            connected: this.isConnected,
            dead: this.isDead,
            surrender: false,
        }
    }
    AbstractPlayer.prototype.getPrivatePlayerState = function () {
        return __assign(__assign({}, this.getPublicPlayerState()), { money: this.money })
    }
    AbstractPlayer.prototype.unitAction = function (action) {
        var unit = xyMapToArray_1.xyMapToArray(this.units).find(function (unit) {
            return unit.id === action.unitId
        })
        if (unit) {
            unit.addAction(action)
        }
    }
    AbstractPlayer.prototype.update = function (map, players) {
        var _this = this
        if (this.isDead) {
            return
        }
        this.unitCount = 0
        xyMapToArray_1.iterateOnXYMap(this.units, function (unit, x, y) {
            unit.update(map)
            var unitNewPos = unit.position.getRounded()
            if (unitNewPos.x !== x || unitNewPos.y !== y) {
                // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything
                delete _this.units[x][y]
                if (!_this.units[unitNewPos.x]) {
                    _this.units[unitNewPos.x] = {}
                }
                if (_this.units[unitNewPos.x][unitNewPos.y]) {
                    // merge unit on same player
                    _this.units[unitNewPos.x][unitNewPos.y].life.heal(unit.life.getHP())
                    delete _this.units[x][y]
                } else {
                    _this.units[unitNewPos.x][unitNewPos.y] = unit
                }
            }
            _this.unitCount += unit.life.getHP()
        })
    }
    AbstractPlayer.prototype.updateIncome = function (ownedCountriesIds, emitter) {
        if (this.isDead) {
            return
        }
        this.ownedCountriesIds = ownedCountriesIds
        this.income = ownedCountriesIds.reduce(function (acc, id) {
            return acc + (COUNTRIES_INCOME_1.COUNTRIES_INCOME[id] || 0)
        }, GameSettings_1.MONEY_START)
        if (this.income === GameSettings_1.MONEY_START && this.ownedCountriesIds.length === 0 && this.unitCount === 0) {
            this.isDead = true
            emitter.emitMessage('Player is dead: ' + this.name, this)
        }
    }
    AbstractPlayer.prototype.spendMoney = function (unitType) {
        this.money -= unitType
    }
    return AbstractPlayer
})()
exports.AbstractPlayer = AbstractPlayer
