"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitActionType = exports.UnitActionMoveData = exports.UnitAction = void 0;
var UnitAction = /** @class */ (function () {
    function UnitAction(unitId, type, data) {
        this.unitId = unitId;
        this.type = type;
        this.data = data;
    }
    return UnitAction;
}());
exports.UnitAction = UnitAction;
var UnitActionMoveData = /** @class */ (function () {
    function UnitActionMoveData(destination) {
        this.destination = destination;
    }
    return UnitActionMoveData;
}());
exports.UnitActionMoveData = UnitActionMoveData;
var UnitActionType;
(function (UnitActionType) {
    UnitActionType[UnitActionType["Move"] = 0] = "Move";
})(UnitActionType = exports.UnitActionType || (exports.UnitActionType = {}));
