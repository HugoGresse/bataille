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
exports.NeutralPlayerInstance = exports.NeutralPlayer = exports.Player = exports.AbstractPlayer = void 0
var xyMapToArray_1 = require('../utils/xyMapToArray')
var uuid_1 = require('uuid')
var COUNTRIES_INCOME_1 = require('./map/COUNTRIES_INCOME')
var GameSettings_1 = require('../../common/GameSettings')
var UNITS_1 = require('../../common/UNITS')
var AbstractPlayer = /** @class */ (function () {
    function AbstractPlayer(name, color) {
        if (name === void 0) {
            name = '' + Date.now()
        }
        this.color = color
        this._name = '' + Date.now()
        this.units = {}
        this.income = 2
        this.money = GameSettings_1.MONEY_START
        this.isConnected = true
        this.isDead = false
        this.ownedCountriesIds = []
        this.unitCount = 0
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
                return false
            }
            existingUnit.life.setHP(existingUnit.life.getHP() + unit.life.getHP())
        } else {
            this.units[x][y] = unit
        }
        return true
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
            alive: this.isConnected && !this.isDead,
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
    AbstractPlayer.prototype.update = function (map) {
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
    AbstractPlayer.prototype.updateIncome = function (ownedCountriesIds) {
        if (this.isDead) {
            return
        }
        this.ownedCountriesIds = ownedCountriesIds
        this.income = ownedCountriesIds.reduce(function (acc, id) {
            return acc + (COUNTRIES_INCOME_1.COUNTRIES_INCOME[id] || 0)
        }, GameSettings_1.MONEY_START)
        if (this.income === GameSettings_1.MONEY_START && this.ownedCountriesIds.length === 0 && this.unitCount === 0) {
            this.isDead = true
        }
    }
    AbstractPlayer.prototype.spendMoney = function (unitType) {
        this.money -= unitType
    }
    return AbstractPlayer
})()
exports.AbstractPlayer = AbstractPlayer
var Player = /** @class */ (function (_super) {
    __extends(Player, _super)
    function Player(socket, color, name) {
        var _this = _super.call(this, name, color) || this
        _this.socket = socket
        _this.listenForDisconnect()
        return _this
    }
    Player.prototype.listenForDisconnect = function () {
        var _this = this
        this.socket.on('disconnect', function () {
            _this.setConnected(false)
        })
    }
    return Player
})(AbstractPlayer)
exports.Player = Player
var NeutralPlayer = /** @class */ (function (_super) {
    __extends(NeutralPlayer, _super)
    function NeutralPlayer() {
        return _super.call(this, 'Neutral', '0x888888') || this
    }
    return NeutralPlayer
})(AbstractPlayer)
exports.NeutralPlayer = NeutralPlayer
exports.NeutralPlayerInstance = new NeutralPlayer()
