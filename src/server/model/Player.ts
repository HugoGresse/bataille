import {PlayerState, UnitState} from './GameState'
import {BaseUnit} from './actors/units/BaseUnit'
import {UnitAction} from '../../common/UnitAction'
import {xyMapToArray} from '../utils/xyMapToArray'

export type UnitTile = {
    [x: number]: {
        [y: number]: BaseUnit
    }
}

abstract class AbstractPlayer {

    protected _name: string = `${Date.now()}`
    protected units: UnitTile = {}

    protected constructor(name = `${Date.now()}`, public color: string) {
        this.name = name
    }

    set name(name: string) {
        this._name = name.trim()
    }

    get name() {
        return this._name
    }

    addUnit(unit: BaseUnit, x: number, y: number) {
        if(!this.units[x]){
            this.units[x] = {}
        }
        this.units[x][y] = unit
        console.log("add unit", x, y)
    }

    getUnitsState(): UnitState[] {
        return xyMapToArray<BaseUnit>(this.units)
            .map((unit: BaseUnit) => ({
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
        const unit = xyMapToArray<BaseUnit>(this.units).find(unit => unit.id === action.unitId)
        if(unit){
            unit.addAction(action)
        }
    }

    update() {
        xyMapToArray<BaseUnit>(this.units).forEach(unit => unit.update())
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
