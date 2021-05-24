import {PlayerState, UnitState} from './GameState'
import {BaseUnit} from './actors/units/BaseUnit'
import {UnitAction} from '../../common/UnitAction'

abstract class AbstractPlayer {

    protected _name: string = `${Date.now()}`
    protected units: BaseUnit[] = []

    protected constructor(name = `${Date.now()}`, public color: string) {
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

export class Player extends AbstractPlayer {

    constructor(protected socketId: string,  color: string, name ?: string,) {
        super(name, color);
    }
}

export class NeutralPlayer extends Player {

    constructor() {
        super("Neutral", "0x888888");
    }

}
export const NeutralPlayerInstance = new NeutralPlayer()
