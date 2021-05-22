import {PlayerState, UnitState} from './GameState'
import {BaseUnit} from './actors/units/BaseUnit'
import {UnitAction} from '../../common/UnitAction'

export class Player {

    protected _name: string = `${Date.now()}`
    protected units: BaseUnit[] = []

    constructor(protected socketId: string, name = `${Date.now()}`) {
        this.name = name
    }

    set name(name: string) {
        this._name = name.trim()
    }

    get name() {
        return this._name
    }

    addUnit(unit: BaseUnit) {
        this.units.push(unit)
    }

    getUnitsState(): UnitState[] {
        return this.units.map((unit: BaseUnit) => ({
            id: unit.id,
            type: unit.type,
            hp: unit.life.get(),
            position: unit.position.get()
        }))
    }

    getPlayerState(): PlayerState {
        return {
            name: this.name
        }
    }

    unitAction(action: UnitAction) {
        const unit = this.units.find(unit => unit.id === action.unitId)
        if(unit){
            unit.addAction(action)
        }
    }

    update() {
        this.units.forEach(unit => unit.update())
    }
}
