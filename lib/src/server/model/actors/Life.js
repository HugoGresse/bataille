'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Life = void 0
class Life {
    constructor(hp) {
        this.initialHP = hp
        this.currentHP = hp
    }
    get() {
        return {
            current: this.currentHP,
            initial: this.initialHP,
        }
    }
    setHP(life) {
        this.currentHP = life
    }
    getHP() {
        return this.currentHP
    }
    takeDamage(value) {
        this.currentHP -= value
        if (this.currentHP < 0) {
            this.currentHP = 0
        }
        return this.currentHP > 0 // True if alive
    }
    heal(healValue) {
        this.currentHP += healValue
    }
}
exports.Life = Life
