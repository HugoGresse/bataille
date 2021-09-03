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
var NeutralPlayer_1 = require('./NeutralPlayer')
var UnitAction_1 = require('../../../common/UnitAction')
var Position_1 = require('../actors/Position')
var createUnitMaps_1 = require('../../engine/utils/createUnitMaps')
var UNITS_1 = require('../../../common/UNITS')
var IA_UPDATE_INTERVAL = 1000 // ms
var IAPlayer = /** @class */ (function (_super) {
    __extends(IAPlayer, _super)
    function IAPlayer(color, name) {
        var _this = _super.call(this, name, color) || this
        _this.lastRunTime = 0
        return _this
    }
    IAPlayer.prototype.setActionsProcessor = function (actionsProcessor) {
        this.actionsProcessor = actionsProcessor
    }
    IAPlayer.prototype.update = function (map, players) {
        _super.prototype.update.call(this, map, players)
        if (this.lastRunTime + IA_UPDATE_INTERVAL >= Date.now()) {
            return
        }
        this.lastRunTime = Date.now()
        if ((this.money > 0 && this.unitCount === 0) || this.isDead) {
            return
        }
        this.checkCountries(map, players)
    }
    /**
     * 1. Try to finish capturing country the IA has town in
     *      // 1. Check if country is not owned by anyone
     * 2. if all countries fully captured, launch unit to capture a town on a close country
     */
    IAPlayer.prototype.checkCountries = function (map, players) {
        var _this = this
        var townByCountries = map.getTownsByCountries()
        // console.log("---------------------------")
        Object.keys(townByCountries).forEach(function (countryId) {
            var isCountryUnifiedUnderOnePlayer = true
            var ownedTown = null
            var townToCapture = null
            if (_this.money <= 0) {
                return
            }
            for (var _i = 0, _a = townByCountries[countryId]; _i < _a.length; _i++) {
                var town = _a[_i]
                if (town.player.id === _this.id) {
                    ownedTown = town
                } else if (town.player.id !== _this.id || _this instanceof NeutralPlayer_1.NeutralPlayer) {
                    isCountryUnifiedUnderOnePlayer = false
                    townToCapture = town
                }
                if (ownedTown && !isCountryUnifiedUnderOnePlayer) {
                    break
                }
            }
            if (townToCapture && ownedTown) {
                var unitsMaps = createUnitMaps_1.createUnitMaps(players)
                var enemyUnit = void 0
                if (unitsMaps[townToCapture.x] && unitsMaps[townToCapture.x][townToCapture.y]) {
                    enemyUnit = unitsMaps[townToCapture.x][townToCapture.y][0]
                }
                var unitCountToCreate = enemyUnit ? ~~(enemyUnit.life.getHP() / 2) : 1
                // console.log("create unit on ", ownedTown.data)
                var startX = ownedTown.x * UNITS_1.TILE_WIDTH_HEIGHT + 2
                var startY = ownedTown.y * UNITS_1.TILE_WIDTH_HEIGHT + 2
                var createdUnit = _this.actionsProcessor.addUnit(_this, {
                    x: startX,
                    y: startY,
                })
                for (var i = 1; i < unitCountToCreate; i++) {
                    _this.actionsProcessor.addUnit(_this, {
                        x: startX,
                        y: startY,
                    })
                }
                if (createdUnit) {
                    // console.log("move unit to dest", townToCapture.data)
                    _this.actionsProcessor.unitEvent(
                        _this,
                        new UnitAction_1.UnitAction(
                            createdUnit.id,
                            UnitAction_1.UnitActionType.Move,
                            new UnitAction_1.UnitActionMoveData(
                                new Position_1.Position(
                                    townToCapture.x * UNITS_1.TILE_WIDTH_HEIGHT + 2,
                                    townToCapture.y * UNITS_1.TILE_WIDTH_HEIGHT + 2
                                )
                            )
                        )
                    )
                }
            }
        })
    }
    return IAPlayer
})(AbstractPlayer_1.AbstractPlayer)
exports.IAPlayer = IAPlayer
