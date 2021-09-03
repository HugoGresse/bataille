import { AbstractPlayer } from './AbstractPlayer'
import { Map } from '../map/Map'
import { NeutralPlayer } from './NeutralPlayer'
import { Town } from '../map/Tile'
import { ActionsProcessor } from '../../engine/ActionsProcessor'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../../../common/UnitAction'
import { Position } from '../actors/Position'
import { createUnitMaps } from '../../engine/utils/createUnitMaps'
import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'

const IA_UPDATE_INTERVAL = 1000 // ms

export class IAPlayer extends AbstractPlayer {
    private lastRunTime: number = 0
    private actionsProcessor!: ActionsProcessor

    constructor(color: string, name?: string) {
        super(name, color)
    }

    setActionsProcessor(actionsProcessor: ActionsProcessor) {
        this.actionsProcessor = actionsProcessor
    }

    update(map: Map, players: AbstractPlayer[]) {
        super.update(map, players)
        if (this.lastRunTime + IA_UPDATE_INTERVAL >= Date.now()) {
            return
        }
        this.lastRunTime = Date.now()

        if ((this.money > 0 && this.unitCount === 0) || this.isDead) {
            return
        }

        this.checkCountries(map, players)
    }

    /**
     * 1. Try to finish capturing country the IA has town in
     *      // 1. Check if country is not owned by anyone
     * 2. if all countries fully captured, launch unit to capture a town on a close country
     */
    private checkCountries(map: Map, players: AbstractPlayer[]) {
        const townByCountries = map.getTownsByCountries()
        // console.log("---------------------------")
        Object.keys(townByCountries).forEach((countryId) => {
            let isCountryUnifiedUnderOnePlayer = true
            let ownedTown: Town | null = null
            let townToCapture: Town | null = null

            if (this.money <= 0) {
                return
            }

            for (const town of townByCountries[countryId]) {
                if (town.player.id === this.id) {
                    ownedTown = town
                } else if (town.player.id !== this.id || this instanceof NeutralPlayer) {
                    isCountryUnifiedUnderOnePlayer = false
                    townToCapture = town
                }
                if (ownedTown && !isCountryUnifiedUnderOnePlayer) {
                    break
                }
            }
            if (townToCapture && ownedTown) {
                const unitsMaps = createUnitMaps(players)

                let enemyUnit
                if (unitsMaps[townToCapture.x] && unitsMaps[townToCapture.x][townToCapture.y]) {
                    enemyUnit = unitsMaps[townToCapture.x][townToCapture.y][0]
                }
                const unitCountToCreate = enemyUnit ? ~~(enemyUnit.life.getHP() / 2) : 1

                // console.log("create unit on ", ownedTown.data)

                const startX = ownedTown.x * TILE_WIDTH_HEIGHT + 2
                const startY = ownedTown.y * TILE_WIDTH_HEIGHT + 2

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
                    // console.log("move unit to dest", townToCapture.data)
                    this.actionsProcessor.unitEvent(
                        this,
                        new UnitAction(
                            createdUnit.id,
                            UnitActionType.Move,
                            new UnitActionMoveData(
                                new Position(
                                    townToCapture.x * TILE_WIDTH_HEIGHT + 2,
                                    townToCapture.y * TILE_WIDTH_HEIGHT + 2
                                )
                            )
                        )
                    )
                }
            }
        })
    }
}
