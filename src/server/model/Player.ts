import { PrivatePlayerState, PublicPlayerState, UnitState } from './GameState'
import { BaseUnit } from './actors/units/BaseUnit'
import { UnitAction } from '../../common/UnitAction'
import { iterateOnXYMap, xyMapToArray } from '../utils/xyMapToArray'
import { v4 as uuidv4 } from 'uuid'
import { COUNTRIES_INCOME } from './map/COUNTRIES_INCOME'
import { MONEY_START } from '../../common/GameSettings'
import { MAX_UNIT_LIFE, UnitsType } from '../../common/UNITS'
import { Socket } from 'socket.io'
import { Map } from './map/Map'
import { SocketEmitter } from '../SocketEmitter'

export type UnitTiles = {
    [x: number]: {
        [y: number]: BaseUnit
    }
}

export abstract class AbstractPlayer {
    protected _name: string = `${Date.now()}`
    protected units: UnitTiles = {}
    public id: string
    public income: number = 2
    public money: number = MONEY_START
    public isConnected: boolean = true
    public isDead: boolean = false
    public ownedCountriesIds: string[] = []
    private unitCount = 0

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

    setConnected(isConnected: boolean) {
        this.isConnected = isConnected
    }

    addUnit(unit: BaseUnit, x: number, y: number): boolean {
        if (!this.units[x]) {
            this.units[x] = {}
        }
        if (this.units[x][y]) {
            const existingUnit = this.units[x][y]
            if (existingUnit.life.getHP() >= MAX_UNIT_LIFE) {
                return false
            }
            existingUnit.life.setHP(existingUnit.life.getHP() + unit.life.getHP())
        } else {
            this.units[x][y] = unit
        }
        return true
    }

    getUnits(): UnitTiles {
        return this.units
    }

    getUnitsState(): UnitState[] {
        return xyMapToArray<BaseUnit>(this.units).map((unit: BaseUnit) => ({
            id: unit.id,
            type: unit.type,
            hp: unit.life.get(),
            position: unit.position.get(),
            color: this.color.replace('0x', '#'),
        }))
    }

    getPublicPlayerState(): PublicPlayerState {
        return {
            name: this.name,
            income: this.income,
            color: this.color,
            countries: this.ownedCountriesIds,
            alive: this.isConnected && !this.isDead,
        }
    }

    getPrivatePlayerState(): PrivatePlayerState {
        return {
            ...this.getPublicPlayerState(),
            money: this.money,
        }
    }

    unitAction(action: UnitAction) {
        const unit = xyMapToArray<BaseUnit>(this.units).find((unit) => unit.id === action.unitId)
        if (unit) {
            unit.addAction(action)
        }
    }

    update(map: Map) {
        if (this.isDead) {
            return
        }
        this.unitCount = 0
        iterateOnXYMap<BaseUnit>(this.units, (unit, x, y) => {
            unit.update(map)
            const unitNewPos = unit.position.getRounded()
            if (unitNewPos.x !== x || unitNewPos.y !== y) {
                // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything
                delete this.units[x][y]
                if (!this.units[unitNewPos.x]) {
                    this.units[unitNewPos.x] = {}
                }
                if (this.units[unitNewPos.x][unitNewPos.y]) {
                    // merge unit on same player
                    this.units[unitNewPos.x][unitNewPos.y].life.heal(unit.life.getHP())
                    delete this.units[x][y]
                } else {
                    this.units[unitNewPos.x][unitNewPos.y] = unit
                }
            }
            this.unitCount += unit.life.getHP()
        })
    }

    updateIncome(ownedCountriesIds: string[], emitter: SocketEmitter) {
        if (this.isDead) {
            return
        }
        this.ownedCountriesIds = ownedCountriesIds
        this.income = ownedCountriesIds.reduce((acc: number, id) => {
            return acc + (COUNTRIES_INCOME[id] || 0)
        }, MONEY_START)
        if (this.income === MONEY_START && this.ownedCountriesIds.length === 0 && this.unitCount === 0) {
            this.isDead = true
            emitter.emitMessage(`Player is dead: ${this.name}`, this)
        }
    }
    spendMoney(unitType: UnitsType) {
        this.money -= unitType
    }
}

export class Player extends AbstractPlayer {
    constructor(protected socket: Socket, color: string, name?: string) {
        super(name, color)
    }

    public listenForDisconnect(socketEmitter: SocketEmitter, onPlayerDisconnect: () => void) {
        this.socket.on('disconnect', () => {
            socketEmitter.emitMessage(`ℹ️️ Player disconnected: ${this.name}`, this)
            this.setConnected(false)
            onPlayerDisconnect()
        })
    }
}

export class NeutralPlayer extends AbstractPlayer {
    constructor() {
        super('Neutral', '0x888888')
    }
}
export const NeutralPlayerInstance = new NeutralPlayer()
