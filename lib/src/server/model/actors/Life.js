"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Life = void 0;
var Life = /** @class */ (function () {
    function Life(hp) {
        this.initialHP = hp;
        this.currentHP = hp;
    }
    Life.prototype.get = function () {
        return {
            current: this.currentHP,
            initial: this.initialHP
        };
    };
    Life.prototype.setHP = function (life) {
        this.currentHP = life;
    };
    Life.prototype.getHP = function () {
        return this.currentHP;
    };
    Life.prototype.takeDamage = function (value) {
        this.currentHP -= value;
        return this.currentHP > 0; // True if alive
    };
    Life.prototype.heal = function (healValue) {
        this.currentHP += healValue;
    };
    return Life;
}());
exports.Life = Life;
