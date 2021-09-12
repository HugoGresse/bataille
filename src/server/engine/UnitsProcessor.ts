import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { MAX_UNIT_LIFE } from '../../common/UNITS'
import { UnitAction } from '../../common/UnitAction'
import { iterateOnXYMap, xyMapToArray } from '../utils/xyMapToArray'
import { Map } from '../model/map/Map'
import { PlayersById } from '../model/types/PlayersById'
import { TilePublic } from '../model/map/Tile'
import { UnitState } from '../model/GameState'

export type UnitsTiles = {
    [x: number]: {
        [y: number]: BaseUnit
    }
}

export class UnitsProcessor {
    constructor(private units: UnitsTiles) {}

    /**
     * 1. make unit move
     * 2. If destination is filled, make it fight/merge
     * 3. go to next unit
     */
    public updateUnits(
        map: Map,
        players: PlayersById
    ): {
        updatedUnits: UnitState[]
        deletedUnits: UnitState[]
    } {
        const updatedUnits: UnitState[] = []
        const deletedUnits: UnitState[] = []

        Object.values(players).forEach((player) => player.setUnitCount(0))

        // 1. Update unit positions
        let unitMoved = false
        iterateOnXYMap<BaseUnit>(this.units, (unit, x, y) => {
            if (unit) {
                players[unit.owner.id].incrementUnitCount(unit.life.getHP())
            } else {
                delete this.units[x][y]
                return
            }

            unitMoved = unit.update(map)
            if (unitMoved) {
                updatedUnits.push(unit.getPublicState())
                const unitNewPos = unit.position.getRounded()
                if (unitNewPos.x != x || unitNewPos.y != y) {
                    // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything

                    delete this.units[x][y]
                    if (!this.units[unitNewPos.x]) {
                        this.units[unitNewPos.x] = {}
                        this.units[unitNewPos.x][unitNewPos.y] = unit
                        updatedUnits.push(unit.getPublicState())
                    } else if (this.units[unitNewPos.x][unitNewPos.y]) {
                        // collisions
                        const { deadUnits, aliveUnit } = this.processUnitsOnSameTile(
                            unit,
                            this.units[unitNewPos.x][unitNewPos.y]
                        )
                        deletedUnits.push(...deadUnits.map((u) => u.getPublicState()))
                        if (aliveUnit) {
                            this.units[unitNewPos.x][unitNewPos.y] = aliveUnit
                        } else {
                            delete this.units[unitNewPos.x][unitNewPos.y]
                        }
                    } else {
                        this.units[unitNewPos.x][unitNewPos.y] = unit
                        updatedUnits.push(unit.getPublicState())
                    }
                }
            }
        })

        return {
            updatedUnits,
            deletedUnits,
        }
    }

    /**
     * Unit fight are done before reaching this, ensuring there should only be the town to conquer
     * @param map
     */
    public updateTownsFromUnits(map: Map): {
        towns: TilePublic[]
        deletedUnits: UnitState[]
    } {
        const towns = map.getTowns()
        const changedTowns: TilePublic[] = []
        const deletedUnits: UnitState[] = []
        for (const town of towns) {
            const unitOnTown = this.units[town.x] ? this.units[town.x][town.y] : null
            if (unitOnTown) {
                if (town.player?.id !== unitOnTown.owner.id) {
                    town.player = unitOnTown.owner
                    changedTowns.push(town.export())
                    unitOnTown.life.takeDamage(1)
                    if (unitOnTown.life.getHP() <= 0) {
                        delete this.units[town.x][town.y]
                        deletedUnits.push(unitOnTown.getPublicState())
                    }
                }
            }
        }
        return {
            towns: changedTowns,
            deletedUnits,
        }
    }

    public getUnits() {
        return this.units
    }

    // Actions

    public addUnit(unit: BaseUnit, player: AbstractPlayer, x: number, y: number): BaseUnit | null {
        if (!this.units[x]) {
            this.units[x] = {}
        }
        if (this.units[x][y]) {
            const existingUnit = this.units[x][y]

            if (existingUnit) {
                if (existingUnit.owner.id === player.id) {
                    if (existingUnit.life.getHP() >= MAX_UNIT_LIFE) {
                        return null
                    }
                    existingUnit.life.heal(unit.life.getHP())
                    existingUnit.forceUpdate = true
                    return existingUnit
                } else {
                    console.warn('This town does not belong to the user')
                    return null
                }
            }
            {
                this.units[x][y] = unit
                return unit
            }
        } else {
            this.units[x][y] = unit
        }
        return unit
    }

    public unitAction(player: AbstractPlayer, action: UnitAction) {
        // TODO : rather than getting the unit ID, get the unit position from the frontend, faster and safer
        const unit = xyMapToArray<BaseUnit>(this.units).find((unit) => unit.id === action.unitId)
        if (unit && unit.owner.id === player.id) {
            unit.addAction(action)
        }
    }

    private processUnitsOnSameTile(
        firstUnit: BaseUnit,
        secondUnit: BaseUnit
    ): {
        deadUnits: BaseUnit[]
        aliveUnit: BaseUnit | null
    } {
        const deadUnits: BaseUnit[] = []
        let alive: BaseUnit | null = null

        if (firstUnit.owner.id === secondUnit.owner.id) {
            // merge units on same player
            firstUnit.life.heal(secondUnit.life.getHP())
            secondUnit.life.setHP(0)
        } else {
            // make units fights
            const firstUnitLife = firstUnit.life.getHP()
            const secondUnitLife = secondUnit.life.getHP()

            firstUnit.life.takeDamage(secondUnit.damage * secondUnitLife)
            secondUnit.life.takeDamage(firstUnit.damage * firstUnitLife)
        }

        if (firstUnit.life.getHP() <= 0) {
            deadUnits.push(firstUnit)
        } else {
            alive = firstUnit
        }

        if (secondUnit.life.getHP() <= 0) {
            deadUnits.push(secondUnit)
        } else {
            if (alive) {
                console.log('alive already??? ')
            }
            alive = secondUnit
        }

        return {
            deadUnits,
            aliveUnit: alive,
        }
    }
}
