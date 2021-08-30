export class Life {
    protected initialHP: number
    protected currentHP: number

    constructor(hp: number) {
        this.initialHP = hp
        this.currentHP = hp
    }

    get() {
        return {
            current: this.currentHP,
            initial: this.initialHP,
        }
    }

    public setHP(life: number) {
        this.currentHP = life
    }

    public getHP() {
        return this.currentHP
    }

    public takeDamage(value: number): boolean {
        this.currentHP -= value
        return this.currentHP > 0 // True if alive
    }

    public heal(healValue: number) {
        this.currentHP += healValue
    }
}
