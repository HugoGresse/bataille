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
var COUNTRIES_INCOME_1 = require('../map/COUNTRIES_INCOME')
var AbstractPlayer = /** @class */ (function () {
    function AbstractPlayer(name, color) {
        if (name === void 0) {
            name = '' + Date.now()
        }
        this.color = color
        this._name = '' + Date.now()
        this.unitCount = 0
        this.income = GameSettings_1.MONEY_INCOME_START
        this.money = GameSettings_1.MONEY_INCOME_START
        this.isConnected = true
        this.isDead = false
        this.ownedCountriesIds = []
        this.id = uuid_1.v4()
        this.name = name
        this.colorHex = color.replace('0x', '#')
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
    AbstractPlayer.prototype.setUnitCount = function (count) {
        this.unitCount = count
    }
    AbstractPlayer.prototype.incrementUnitCount = function (count) {
        this.unitCount += count
    }
    AbstractPlayer.prototype.setConnected = function (isConnected) {
        this.isConnected = isConnected
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
    /**
     * Update the players (only the IA Player type
     * @param map
     * @param units
     */
    AbstractPlayer.prototype.update = function (map, units) {}
    AbstractPlayer.prototype.updateIncome = function (ownedCountriesIds, emitter) {
        if (this.isDead) {
            return
        }
        this.ownedCountriesIds = ownedCountriesIds
        this.income = ownedCountriesIds.reduce(function (acc, id) {
            return acc + (COUNTRIES_INCOME_1.COUNTRIES_INCOME[id] || 0)
        }, GameSettings_1.MONEY_INCOME_START)
        if (
            this.income === GameSettings_1.MONEY_INCOME_START &&
            this.ownedCountriesIds.length === 0 &&
            this.unitCount === 0
        ) {
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
