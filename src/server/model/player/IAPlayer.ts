import { AbstractPlayer } from './AbstractPlayer'
import { CountryIdToInfo, GameMap } from '../map/GameMap'
import { NeutralPlayer } from './NeutralPlayer'
import { Town } from '../map/Tile'
import { ActionsProcessor } from '../../engine/ActionsProcessor'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../../../common/UnitAction'
import { Position } from '../actors/Position'
import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { BaseUnit } from '../actors/units/BaseUnit'
import { getRandomNumberBetween } from '../../../utils/getRandomNumberBetween'
import { SocketEmitter } from '../../SocketEmitter'
import { UnitsProcessor, UnitsTiles } from '../../engine/UnitsProcessor'
import { IASettings } from '../../../common/GameSettings'

export class IAPlayer extends AbstractPlayer {
    private lastRunTime: number = 0
    private actionsProcessor!: ActionsProcessor
    private unitsProcessor!: UnitsProcessor
    private actionByCountries: {
        [countryId: string]: string
    } = {}
    private countriesToRecapture: string[] = []
    private actionByUpdate = 0
    private updateDelay = getRandomNumberBetween(IASettings.randomMin, IASettings.randomMax)

    constructor(color: string, name?: string) {
        super(name, color)
    }

    setProcessor(actionsProcessor: ActionsProcessor, unitsProcessor: UnitsProcessor) {
        this.actionsProcessor = actionsProcessor
        this.unitsProcessor = unitsProcessor
    }

    update(map: GameMap, units: UnitsTiles): void {
        super.update(map, units)
        if (this.lastRunTime === 0) {
            // Game starting
            this.lastRunTime =
                Date.now() +
                IASettings.updateInterval +
                getRandomNumberBetween(IASettings.randomMin, IASettings.randomMax)
            return
        }
        if (this.lastRunTime + IASettings.updateInterval + this.updateDelay >= Date.now()) {
            return
        }
        this.lastRunTime = Date.now()
        this.updateDelay = getRandomNumberBetween(IASettings.randomMin, IASettings.randomMax)

        if ((this.money > 0 && this.unitCount === 0) || this.isDead) {
            return
        }

        this.actionByUpdate = 0

        const currentCountriesAllOwned = this.checkCurrentCountries(map, units)
        if (currentCountriesAllOwned) {
            if (this.countriesToRecapture.length > 0) {
                // console.log("capturing lost country")
                // Not used currently
            }
            this.captureNeighboursCountries(map, units)
        }
        return
    }

    updateIncome(ownedCountriesIds: string[], emitter: SocketEmitter) {
        let lostCountries: string[] = []
        if (ownedCountriesIds) {
            lostCountries = this.ownedCountriesIds.filter((id) => !ownedCountriesIds.includes(id))
        }
        super.updateIncome(ownedCountriesIds, emitter)

        if (lostCountries.length) {
            for (const id of lostCountries) {
                if (!this.actionByCountries[id] && !this.countriesToRecapture.includes(id)) {
                    this.countriesToRecapture.push(id)
                }
            }
        }
    }

    /**
     * 1. Try to finish capturing country the IA has town in
     *      // 1. Check if country contain one not current player town and one current player town
     *      // 2. if so, send unit to take the next town, on every update
     */
    private checkCurrentCountries(map: GameMap, unitsMaps: UnitsTiles) {
        const townByCountries = map.getTownsByCountries()
        let nothingToDo = true
        Object.keys(townByCountries).forEach((countryId) => {
            let ownAllTheTowns = true
            let fromTown: Town | null = null
            let townToCapture: Town | null = null

            if (this.money <= 0) {
                nothingToDo = false
                return nothingToDo
            }

            for (const town of townByCountries[countryId]) {
                if (town.player.id === this.id) {
                    fromTown = town
                } else if (town.player.id !== this.id || this instanceof NeutralPlayer) {
                    ownAllTheTowns = false
                    townToCapture = town
                }
                if (!ownAllTheTowns) {
                    if (fromTown) {
                        break
                    }
                }
            }
            if (townToCapture && fromTown) {
                const unitSent = this.sendUnit(fromTown, townToCapture, unitsMaps)
                this.actionByCountries[countryId] = townToCapture.id
                if (unitSent) {
                    // console.log("take empty country")
                }
                nothingToDo = false
            } else if (ownAllTheTowns && this.actionByCountries[countryId]) {
                // country owned fully
                // console.log("Country owned", countryId)
                delete this.actionByCountries[countryId]
            }
        })
        return nothingToDo
    }

    private captureNeighboursCountries(map: GameMap, unitsMaps: UnitsTiles) {
        this.ownedCountriesIds.forEach((countryId) => {
            const neighbours = CountryIdToInfo[countryId].neighbours
            for (const neighboursCountryId of neighbours) {
                if (!this.ownedCountriesIds.includes(neighboursCountryId) && this.money > 10) {
                    // This country is not owned by the player
                    const townToCapture = map.getTownsByCountries()[neighboursCountryId][0]
                    const countryTowns = map.getTownsByCountries()[countryId]
                    const fromTown = countryTowns[getRandomNumberBetween(0, countryTowns.length - 1)]
                    const unitSent = this.sendUnit(fromTown, townToCapture, unitsMaps)
                    if (unitSent) {
                        // console.log('capturing ', neighboursCountryId, fromTown.data)
                    }
                    break
                }
            }
        })
    }

    sendUnit(from: Town, to: Town, unitsMap: UnitsTiles): boolean {
        if (this.actionByUpdate > IASettings.maxActionsByRun) {
            return false
        }
        const enemyUnit = unitsMap.get(to.x)?.get(to.y)
        const unitCountToCreate = this.getUnitCountToSend(enemyUnit)

        const startX = from.x * TILE_WIDTH_HEIGHT + 2
        const startY = from.y * TILE_WIDTH_HEIGHT + 2

        const createdUnit = this.actionsProcessor.addUnit(this, {
            x: startX,
            y: startY,
        })

        for (let i = 1; i < unitCountToCreate; i++) {
            this.actionsProcessor.addUnit(this, {
                x: startX,
                y: startY,
            })
        }
        if (createdUnit) {
            this.actionByUpdate++
            // console.log("move unit to dest", to.data)
            this.actionsProcessor.unitEvent(
                this,
                new UnitAction(
                    createdUnit.id,
                    UnitActionType.Move,
                    new UnitActionMoveData(new Position(to.x * TILE_WIDTH_HEIGHT + 10, to.y * TILE_WIDTH_HEIGHT + 10))
                )
            )
            return true
        }
        return false
    }

    getUnitCountToSend(enemyUnit?: BaseUnit) {
        if (enemyUnit) {
            if (this.money > 100) {
                return enemyUnit.life.getHP()
            }
            return ~~(enemyUnit.life.getHP() / 2)
        }

        if (this.money > 100) {
            return getRandomNumberBetween(1, 5)
        }
        return 1
    }
}
