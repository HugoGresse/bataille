import { AbstractPlayer } from './AbstractPlayer'
import { CountryIdToInfo, Map } from '../map/Map'
import { NeutralPlayer } from './NeutralPlayer'
import { Town } from '../map/Tile'
import { ActionsProcessor } from '../../engine/ActionsProcessor'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../../../common/UnitAction'
import { Position } from '../actors/Position'
import { createUnitMaps } from '../../engine/utils/createUnitMaps'
import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { BaseUnit } from '../actors/units/BaseUnit'
import { getRandomNumberBetween } from '../../../utils/getRandomNumberBetween'
import { SocketEmitter } from '../../SocketEmitter'
import { XYMapWithType } from '../../utils/xyMapToArray'

const IA_UPDATE_INTERVAL = 2000 // ms
const MAX_ACTION_UPDATE = 5

export class IAPlayer extends AbstractPlayer {
    private lastRunTime: number = 0
    private actionsProcessor!: ActionsProcessor
    private actionByCountries: {
        [countryId: string]: string
    } = {}
    private countriesToRecapture: string[] = []
    private actionByUpdate = 0

    constructor(color: string, name?: string) {
        super(name, color)
    }

    setActionsProcessor(actionsProcessor: ActionsProcessor) {
        this.actionsProcessor = actionsProcessor
    }

    update(map: Map, players: AbstractPlayer[]) {
        super.update(map, players)
        if (this.lastRunTime + IA_UPDATE_INTERVAL + getRandomNumberBetween(500, 3000) >= Date.now()) {
            return
        }
        this.lastRunTime = Date.now()

        if ((this.money > 0 && this.unitCount === 0) || this.isDead) {
            return
        }

        this.actionByUpdate = 0

        const unitsMaps = createUnitMaps(players)

        const currentCountriesAllOwned = this.checkCurrentCountries(map, unitsMaps)
        if (currentCountriesAllOwned) {
            if (this.countriesToRecapture.length > 0) {
                // console.log("capturing lost country")
                // Not used currently
            }
            this.captureNeighboursCountries(map, unitsMaps)
        }
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
    private checkCurrentCountries(map: Map, unitsMaps: XYMapWithType<BaseUnit[]>) {
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

    private captureNeighboursCountries(map: Map, unitsMaps: XYMapWithType<BaseUnit[]>) {
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

    sendUnit(from: Town, to: Town, unitsMap: XYMapWithType<BaseUnit[]>): boolean {
        if (this.actionByUpdate > MAX_ACTION_UPDATE) {
            // console.log("max out")
            return false
        }
        let enemyUnit
        if (unitsMap[to.x] && unitsMap[to.x][to.y]) {
            enemyUnit = unitsMap[to.x][to.y][0]
        }
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
