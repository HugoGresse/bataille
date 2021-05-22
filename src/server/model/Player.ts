import {PlayerState, UnitState} from './GameState'
import {BaseUnit} from './actors/units/BaseUnit'

export class Player {

    protected _name: string = `${Date.now()}`
    protected units: BaseUnit[] = []

    constructor(protected socketId: string, name = `${Date.now()}`) {
        this.name = name
    }

    public set name(name: string) {
        this._name = name.trim()
    }

    public get name() {
        return this._name
    }

    public addUnit(unit: BaseUnit) {
        this.units.push(unit)
    }

    public getUnitsState(): UnitState[] {
        return this.units.map((unit: BaseUnit) => ({
            id: unit.id,
            type: unit.type,
            hp: unit.life.get(),
            position: unit.position.get()
        }))
    }

    public getPlayerState(): PlayerState {
        return {
            name: this.name
        }
    }


}
