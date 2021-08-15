"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StickUnit = void 0;
var BaseUnit_1 = require("./BaseUnit");
var Velocity_1 = require("../Velocity");
var BASE_HP = 1;
var BASE_DAMAGE = 1;
var StickUnit = /** @class */ (function (_super) {
    __extends(StickUnit, _super);
    function StickUnit(owner, position) {
        return _super.call(this, owner, position, BASE_DAMAGE, BASE_HP, new Velocity_1.Velocity(3)) || this;
    }
    return StickUnit;
}(BaseUnit_1.BaseUnit));
exports.StickUnit = StickUnit;
