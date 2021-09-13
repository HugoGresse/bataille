import { MONEY_INCOME_START } from '../../../common/GameSettings'
import { v4 as uuidv4 } from 'uuid'
import { UnitsType } from '../../../common/UNITS'
import { PrivatePlayerState, PublicPlayerState } from '../GameState'
import { GameMap } from '../map/GameMap'
import { SocketEmitter } from '../../SocketEmitter'
import { COUNTRIES_INCOME } from '../map/COUNTRIES_INCOME'
import { UnitsTiles } from '../../engine/UnitsProcessor'

export abstract class AbstractPlayer {
    protected _name: string = `${Date.now()}`
    protected unitCount = 0
    public id: string
    public income: number = MONEY_INCOME_START
    public money: number = MONEY_INCOME_START
    public isConnected: boolean = true
    public isDead: boolean = false
    public ownedCountriesIds: string[] = []
    public ownedCountriesFrom: Map<string, number>
    public colorHex: string

    protected constructor(name = `${Date.now()}`, public color: string) {
        this.id = uuidv4()
        this.name = name
        this.colorHex = color.replace('0x', '#')
        this.ownedCountriesFrom = new Map()
    }

    set name(name: string) {
        this._name = name.trim()
    }

    get name() {
        return this._name
    }

    setUnitCount(count: number) {
        this.unitCount = count
    }

    incrementUnitCount(count: number) {
        this.unitCount += count
    }

    setConnected(isConnected: boolean) {
        this.isConnected = isConnected
    }

    getPublicPlayerState(): PublicPlayerState {
        return {
            name: this.name,
            income: this.income,
            color: this.color,
            countries: this.ownedCountriesIds,
            connected: this.isConnected,
            dead: this.isDead,
            surrender: false,
        }
    }

    getPrivatePlayerState(): PrivatePlayerState {
        return {
            ...this.getPublicPlayerState(),
            money: this.money,
        }
    }

    /**
     * Update the players (only the IA Player type
     * @param map
     * @param units
     */
    update(map: GameMap, units: UnitsTiles): void {}

    updateIncome(ownedCountriesIds: string[], emitter: SocketEmitter) {
        if (this.isDead) {
            return
        }
        for (const previouslyOwnerCountry of this.ownedCountriesIds) {
            if (!ownedCountriesIds.includes(previouslyOwnerCountry)) {
                this.ownedCountriesFrom.delete(previouslyOwnerCountry)
            }
        }
        for (const countryId of ownedCountriesIds) {
            if (!this.ownedCountriesFrom.has(countryId)) {
                this.ownedCountriesFrom.set(countryId, Date.now())
            }
        }
        this.ownedCountriesIds = ownedCountriesIds

        this.income = ownedCountriesIds.reduce((acc: number, id) => {
            return acc + (COUNTRIES_INCOME[id] || 0)
        }, MONEY_INCOME_START)
        if (this.income === MONEY_INCOME_START && this.ownedCountriesIds.length === 0 && this.unitCount === 0) {
            this.isDead = true
            emitter.emitMessage(`Player is dead: ${this.name}`, this)
        }
    }

    spendMoney(unitType: UnitsType) {
        this.money -= unitType
    }

    public getCountriesEligibleForBounty(ts: number) {
        return this.ownedCountriesIds.filter((cid) => {
            return (this.ownedCountriesFrom.get(cid) || Number.MAX_VALUE) < ts
        })
    }
}
