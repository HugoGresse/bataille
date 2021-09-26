'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AbstractPlayer = void 0
const GameSettings_1 = require('../../../common/GameSettings')
const uuid_1 = require('uuid')
const COUNTRIES_INCOME_1 = require('../map/COUNTRIES_INCOME')
class AbstractPlayer {
    constructor(name = `${Date.now()}`, color) {
        this.color = color
        this._name = `${Date.now()}`
        this.unitCount = 0
        this.income = GameSettings_1.MONEY_INCOME_START
        this.money = GameSettings_1.MONEY_INCOME_START
        this.isConnected = true
        this.isDead = false
        this.ownedCountriesIds = []
        this.id = uuid_1.v4()
        this.name = name
        this.colorHex = color.replace('0x', '#')
        this.ownedCountriesFrom = new Map()
    }
    set name(name) {
        this._name = name.trim()
    }
    get name() {
        return this._name
    }
    setUnitCount(count) {
        this.unitCount = count
    }
    incrementUnitCount(count) {
        this.unitCount += count
    }
    setConnected(isConnected) {
        this.isConnected = isConnected
    }
    getPublicPlayerState() {
        return {
            n: this.name,
            i: this.income,
            c: this.color,
            ctr: this.ownedCountriesIds,
            cnt: this.isConnected,
            d: this.isDead,
            s: false,
        }
    }
    getPrivatePlayerState() {
        return Object.assign(Object.assign({}, this.getPublicPlayerState()), { m: this.money })
    }
    getPrivatePlayerStateUpdate() {
        return {
            m: this.money,
        }
    }
    /**
     * Update the players (only the IA Player type
     * @param map
     * @param units
     */
    update(map, units) {}
    updateIncome(ownedCountriesIds, emitter) {
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
        this.income = ownedCountriesIds.reduce((acc, id) => {
            return acc + (COUNTRIES_INCOME_1.COUNTRIES_INCOME[id] || 0)
        }, GameSettings_1.MONEY_INCOME_START)
        if (
            this.income === GameSettings_1.MONEY_INCOME_START &&
            this.ownedCountriesIds.length === 0 &&
            this.unitCount === 0
        ) {
            this.isDead = true
            emitter.emitMessage(`Player is dead: ${this.name}`, this)
        }
    }
    spendMoney(unitType) {
        this.money -= unitType
    }
    getCountriesEligibleForBounty(ts) {
        return this.ownedCountriesIds.filter((cid) => {
            return (this.ownedCountriesFrom.get(cid) || Number.MAX_VALUE) < ts
        })
    }
}
exports.AbstractPlayer = AbstractPlayer
