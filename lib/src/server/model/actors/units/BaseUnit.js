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
exports.BaseUnit = void 0
var Actor_1 = require('../Actor')
var Life_1 = require('../Life')
var UNITS_1 = require('../../../../common/UNITS')
var uuid_1 = require('uuid')
var UnitAction_1 = require('../../../../common/UnitAction')
var BaseUnit = /** @class */ (function (_super) {
    __extends(BaseUnit, _super)
    function BaseUnit(owner, position, damage, hp, velocity) {
        var _this = _super.call(this, owner, position) || this
        _this.damage = damage
        _this.velocity = velocity
        _this.type = UNITS_1.UnitsType.Stick
        _this.actions = []
        _this.id = uuid_1.v4()
        _this.life = new Life_1.Life(hp)
        return _this
    }
    BaseUnit.prototype.addAction = function (action) {
        switch (action.type) {
            case UnitAction_1.UnitActionType.Move:
                // Remove any move action already saved
                this.actions = this.actions.filter(function (action) {
                    return action.type !== UnitAction_1.UnitActionType.Move
                })
                this.actions.push(action)
                break
            default:
                console.log('addAction: Unit action type not managed', action)
                break
        }
    }
    BaseUnit.prototype.update = function () {
        var _this = this
        this.actions = this.actions.reduce(function (acc, action) {
            switch (action.type) {
                case UnitAction_1.UnitActionType.Move:
                    var isDestinationReached = _this.position.move(action.data.destination, _this.velocity)
                    if (!isDestinationReached) {
                        acc.push(action)
                    }
                    break
                default:
                    console.log('update: Unit action type not managed', action)
                    break
            }
            return acc
        }, [])
    }
    return BaseUnit
})(Actor_1.Actor)
exports.BaseUnit = BaseUnit
