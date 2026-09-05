import { MONEY_INCOME_START } from '../../../common/GameSettings'
import { PrivatePlayerState, PrivatePlayerStateUpdate, PublicPlayerState } from '../GameState'
import { GameMap } from '../map/GameMap'
import { SocketEmitter } from '../../SocketEmitter'
import { COUNTRIES_INCOME } from '../map/COUNTRIES_INCOME'
import { UnitsTiles } from '../../engine/UnitsProcessor'

export abstract class AbstractPlayer {
    protected _name: string = `${Date.now()}`
    protected unitCount = 0
    /** Towns currently held. Drives the victory bar, which countries cannot: see engine/domination */
    public townCount = 0
    public id: string
    public income: number = MONEY_INCOME_START
    public money: number = MONEY_INCOME_START
    public isConnected: boolean = true
    /** Eliminated: no towns, no units, no income left */
    public isDead: boolean = false
    /** Left the game on purpose. Their army is gone and their towns are neutral, but they may still watch */
    public hasSurrendered: boolean = false
    /** AI players death notices are not broadcast to humans (they only clutter the UI) */
    public readonly isAI: boolean = false
    public ownedCountriesIds: string[] = []
    public ownedCountriesFrom: Map<string, number>
    public colorHex: string

    protected constructor(
        name = `${Date.now()}`,
        public color: string
    ) {
        this.id = crypto.randomUUID()
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

    setTownCount(count: number) {
        this.townCount = count
    }

    incrementUnitCount(count: number) {
        this.unitCount += count
    }

    setConnected(isConnected: boolean) {
        this.isConnected = isConnected
    }

    /** Out of the running, whichever way it happened: the end-of-game rules only care about this */
    get isOut(): boolean {
        return this.isDead || this.hasSurrendered
    }

    surrender() {
        this.hasSurrendered = true
    }

    getPublicPlayerState(): PublicPlayerState {
        return {
            n: this.name,
            i: this.income,
            c: this.color,
            ctr: this.ownedCountriesIds,
            tw: this.townCount,
            cnt: this.isConnected,
            d: this.isDead,
            s: this.hasSurrendered,
        }
    }

    getPrivatePlayerState(): PrivatePlayerState {
        return {
            ...this.getPublicPlayerState(),
            m: this.money,
        }
    }
    getPrivatePlayerStateUpdate(): PrivatePlayerStateUpdate {
        return {
            m: this.money,
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
        // Nothing left to count, and no death notice for a player who chose to leave
        if (this.hasSurrendered) {
            this.ownedCountriesIds = []
            this.ownedCountriesFrom.clear()
            this.income = 0
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
            if (!this.isAI) {
                emitter.emitMessage(`Player is dead: ${this.name}`, this)
            }
        }
    }

    spendMoney(moneyToSpend: number) {
        this.money -= moneyToSpend
    }

    public getCountriesEligibleForBounty(ts: number) {
        return this.ownedCountriesIds.filter((cid) => {
            return (this.ownedCountriesFrom.get(cid) || Number.MAX_VALUE) < ts
        })
    }
}
