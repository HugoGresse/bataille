'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.UnitActionType = exports.UnitActionMoveData = exports.UnitAction = void 0
class UnitAction {
    constructor(unitId, type, data) {
        this.unitId = unitId
        this.type = type
        this.data = data
    }
}
exports.UnitAction = UnitAction
class UnitActionMoveData {
    constructor(destination) {
        this.destination = destination
    }
}
exports.UnitActionMoveData = UnitActionMoveData
var UnitActionType
;(function (UnitActionType) {
    UnitActionType[(UnitActionType['Move'] = 0)] = 'Move'
})((UnitActionType = exports.UnitActionType || (exports.UnitActionType = {})))
