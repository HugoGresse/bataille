import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { roomInStack } from '../../common/UNITS'
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
                        const occupant = this.units.get(unitNewPos.x)?.get(unitNewPos.y)

                        // A traveling stack crossing an allied tile must NOT merge with it:
                        // it keeps its previous grid registration until it stops somewhere
                        // (final destination or a fight). It also therefore cannot capture a
                        // town it merely walks over.
                        if (occupant && occupant.owner.id === unit.owner.id && unit.isTraveling()) {
                            continue
                        }

                        // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything
                        xEntries.delete(y)

                        // The moving stack leaves its tile: drop the units that were split from it into the vacated tile
                        if (unit.pendingRemnant) {
                            const remnant = unit.pendingRemnant
                            unit.pendingRemnant = null
                            remnant.forceUpdate = true
                            xEntries.set(y, remnant)
                            updatedUnits.push(remnant.getPublicState())
                        }

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
                        // If the dead unit was a split stack still waiting to move, its remnant takes its place
                        if (unitOnTown.pendingRemnant) {
                            const remnant = unitOnTown.pendingRemnant
                            unitOnTown.pendingRemnant = null
                            const column = this.units.get(town.x)
                            if (column && !column.has(town.y)) {
                                column.set(town.y, remnant)
                                updatedUnits.push(remnant.getPublicState())
                            }
                        }
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

    /**
     * @return the stack the units joined and how many actually landed in it, or null when none
     * could: a stack is capped at MAX_UNIT_LIFE, and the caller only charges for what fits.
     */
    public addUnit(
        unit: BaseUnit,
        player: AbstractPlayer,
        x: number,
        y: number
    ): { unit: BaseUnit; added: number } | null {
        let tempX = this.units.get(x)
        if (!tempX) {
            tempX = new Map()
            this.units.set(x, tempX)
        }
        const existingUnit = tempX.get(y)
        if (existingUnit) {
            if (existingUnit.owner.id !== player.id) {
                console.warn('This town does not belong to the user')
                return null
            }
            const added = roomInStack(existingUnit.life.getHP(), unit.life.getHP())
            if (added <= 0) {
                return null
            }
            existingUnit.life.heal(added)
            existingUnit.forceUpdate = true
            return { unit: existingUnit, added }
        }
        const added = roomInStack(0, unit.life.getHP())
        if (added <= 0) {
            return null
        }
        unit.life.setHP(added)
        tempX.set(y, unit)
        return { unit, added }
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
                    this.applyUnitAction(yEntry, action)
                }
            }
        }
    }

    /**
     * Move a whole stack, or split it when the requested amount is lower than its size.
     * The moving part keeps the original unit id, the units left behind are stored as `pendingRemnant`
     * and materialized on the map once the moving stack leaves its tile.
     */
    private applyUnitAction(unit: BaseUnit, action: UnitAction) {
        const hp = unit.life.getHP()
        const rawAmount = action.data.amount
        const amount = rawAmount != null ? Math.floor(rawAmount) : null

        if (amount == null || amount <= 0 || amount >= hp) {
            unit.addAction(action)
            return
        }

        if (unit.pendingRemnant) {
            // A remnant is already waiting for this stack to move: grow it instead of losing units
            unit.pendingRemnant.life.heal(hp - amount)
        } else {
            unit.pendingRemnant = unit.spawnCopy(hp - amount)
        }
        unit.life.setHP(amount)
        unit.forceUpdate = true
        unit.addAction(action)
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
