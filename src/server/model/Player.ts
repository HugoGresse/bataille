import {PrivatePlayerState, PublicPlayerState, UnitState} from './GameState'
import {BaseUnit} from './actors/units/BaseUnit'
import {UnitAction} from '../../common/UnitAction'
import {iterateOnXYMap, xyMapToArray} from '../utils/xyMapToArray'
import {v4 as uuidv4} from 'uuid'
import {COUNTRIES_INCOME} from './map/COUNTRIES_INCOME'
import {MONEY_START} from '../../common/GameSettings'
import {UnitsType} from '../../common/UNITS'

export type UnitTiles = {
    [x: number]: {
        [y: number]: BaseUnit
    }
}

abstract class AbstractPlayer {

    protected _name: string = `${Date.now()}`
    protected units: UnitTiles = {}
    public id: string
    public income: number = 0
    public money: number = MONEY_START

    protected constructor(name = `${Date.now()}`, public color: string) {
        this.id = uuidv4()
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

    getUnits() : UnitTiles {
        return this.units
    }

    getUnitsState(): UnitState[] {
        return xyMapToArray<BaseUnit>(this.units)
            .map((unit: BaseUnit) => ({
            id: unit.id,
            type: unit.type,
            hp: unit.life.get(),
            position: unit.position.get(),
                color: this.color.replace('0x', "#")
        }))
    }

    getPublicPlayerState(): PublicPlayerState {
        return {
            name: this.name,
            income: this.income,
            color: this.color
        }
    }

    getPrivatePlayerState(): PrivatePlayerState {
        return {
            ...this.getPublicPlayerState(),
            money: this.money,
        }
    }

    unitAction(action: UnitAction) {
        const unit = xyMapToArray<BaseUnit>(this.units).find(unit => unit.id === action.unitId)
        if(unit){
            unit.addAction(action)
        }
    }

    update() {
        iterateOnXYMap<BaseUnit>(this.units, (unit, x, y) => {
            unit.update()
            const unitNewPos = unit.position.getRounded()
            if(unitNewPos.x !== x || unitNewPos.y !== y) {
                delete this.units[x][y]
                if(!this.units[unitNewPos.x]) {
                    this.units[unitNewPos.x] = {}
                }
                this.units[unitNewPos.x][unitNewPos.y] = unit
            }
        })
    }
    updateIncome(ownedCountriesIds: string[]) {
        this.income = ownedCountriesIds.reduce((acc: number, id) => {
            return acc + COUNTRIES_INCOME[id]
        }, 0)
    }
    spendMoney(unitType: UnitsType) {
        this.money -= unitType
    }
}

export class Player extends AbstractPlayer {
    constructor(protected socketId: string, color: string, name ?: string,) {
        super(name, color);
    }
}

export class NeutralPlayer extends Player {

    constructor() {
        super("Neutral", "0x888888");
    }

}
export const NeutralPlayerInstance = new NeutralPlayer()
