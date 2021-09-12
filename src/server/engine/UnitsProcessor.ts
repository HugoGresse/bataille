import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { MAX_UNIT_LIFE } from '../../common/UNITS'
import { UnitAction } from '../../common/UnitAction'
import { GameMap } from '../model/map/GameMap'
import { PlayersById } from '../model/types/PlayersById'
import { TilePublic } from '../model/map/Tile'
import { UnitState } from '../model/GameState'

export type UnitsTiles = Map<number, Map<number, BaseUnit>>

export class UnitsProcessor {
    constructor(private units: UnitsTiles = new Map()) {}

    /**
     * 1. make unit move
     * 2. If destination is filled, make it fight/merge
     * 3. go to next unit
     */
    public updateUnits(
        map: GameMap,
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

        let x, xEntries, y, unit
        for (const entryX of this.units) {
            x = entryX[0]
            xEntries = entryX[1]

            for (const entryY of xEntries) {
                y = entryY[0]
                unit = entryY[1]

                if (unit) {
                    players[unit.owner.id].incrementUnitCount(unit.life.getHP())
                } else {
                    console.log('dead unit not removed...', x, y)
                    continue
                }

                unitMoved = unit.update(map)
                if (unitMoved) {
                    updatedUnits.push(unit.getPublicState())
                    const unitNewPos = unit.position.getRounded()
                    if (unitNewPos.x != x || unitNewPos.y != y) {
                        // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything
                        xEntries.delete(y)

                        const tempX = this.units.get(unitNewPos.x)

                        if (!tempX) {
                            const newMap = new Map()
                            newMap.set(unitNewPos.y, unit)
                            this.units.set(unitNewPos.x, newMap)
                            updatedUnits.push(unit.getPublicState())
                        } else {
                            const tempY = tempX.get(unitNewPos.y)
                            if (tempY) {
                                // collisions
                                const { deadUnits, aliveUnit } = this.processUnitsOnSameTile(tempY, unit)
                                deletedUnits.push(...deadUnits.map((u) => u.getPublicState()))
                                if (aliveUnit) {
                                    tempX.set(unitNewPos.y, aliveUnit)
                                    updatedUnits.push(aliveUnit.getPublicState())
                                } else {
                                    tempX.delete(unitNewPos.y)
                                }
                            } else {
                                tempX.set(unitNewPos.y, unit)
                                updatedUnits.push(unit.getPublicState())
                            }
                        }
                    }
                }
            }
        }

        return {
            updatedUnits,
            deletedUnits,
        }
    }

    /**
     * Unit fight are done before reaching this, ensuring there should only be the town to conquer
     * @param map
     */
    public updateTownsFromUnits(map: GameMap): {
        towns: TilePublic[]
        updatedUnits: UnitState[]
        deletedUnits: UnitState[]
    } {
        const towns = map.getTowns()
        const changedTowns: TilePublic[] = []
        const deletedUnits: UnitState[] = []
        const updatedUnits: UnitState[] = []
        for (const town of towns) {
            const unitOnTown = this.units.get(town.x)?.get(town.y) || null
            if (unitOnTown) {
                if (town.player?.id !== unitOnTown.owner.id) {
                    town.player = unitOnTown.owner
                    changedTowns.push(town.export())
                    unitOnTown.life.takeDamage(1)
                    if (unitOnTown.life.getHP() <= 0) {
                        this.units.get(town.x)?.delete(town.y)
                        deletedUnits.push(unitOnTown.getPublicState())
                    } else {
                        updatedUnits.push(unitOnTown.getPublicState())
                    }
                }
            }
        }
        return {
            towns: changedTowns,
            deletedUnits,
            updatedUnits,
        }
    }

    public getUnits() {
        return this.units
    }

    // Actions

    public addUnit(unit: BaseUnit, player: AbstractPlayer, x: number, y: number): BaseUnit | null {
        let tempX = this.units.get(x)
        if (!tempX) {
            tempX = new Map()
            this.units.set(x, tempX)
        }
        const existingUnit = tempX.get(y)
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
        } else {
            tempX.set(y, unit)
        }
        return unit
    }

    public unitAction(player: AbstractPlayer, action: UnitAction) {
        // TODO : rather than getting the unit ID, get the unit position from the frontend, faster and safer

        let x, xEntries, yEntry
        for (const entryX of this.units) {
            x = entryX[0]
            xEntries = entryX[1]

            for (const entryY of xEntries) {
                yEntry = entryY[1]
                if (yEntry.id === action.unitId && yEntry.owner.id === player.id) {
                    yEntry.addAction(action)
                }
            }
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
