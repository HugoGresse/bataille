import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { MAX_UNIT_LIFE } from '../../common/UNITS'
import { UnitAction } from '../../common/UnitAction'
import { iterateOnXYMap, xyMapToArray } from '../utils/xyMapToArray'
import { Map } from '../model/map/Map'
import { PlayersById } from '../model/types/PlayersById'
import { Town } from '../model/map/Tile'

export type UnitsTiles = {
    [x: number]: {
        [y: number]: BaseUnit[]
    }
}

export class UnitsProcessor {
    private updatedUnitsOnLastUpdate: BaseUnit[] = []

    constructor(private units: UnitsTiles) {}

    /**
     * 1. Get units on a given tile
     * 2. If only one unit, process action
     * 2. If more than one unit, merge them or make them fight. If left unit has some pending actions, make it move
     */
    public updateUnits(map: Map, players: PlayersById): BaseUnit[] {
        this.updatedUnitsOnLastUpdate = []

        Object.values(players).forEach((player) => player.setUnitCount(0))

        let unit: BaseUnit
        iterateOnXYMap<BaseUnit[]>(this.units, (units, x, y) => {
            if (units.length === 1) {
                unit = units[0]

                const isUpdatedUnit = unit.update(map)

                const unitNewPos = unit.position.getRounded()
                if (unitNewPos.x !== x || unitNewPos.y !== y) {
                    console.log('1', unitNewPos, x, y)
                    this.updatedUnitsOnLastUpdate.push(unit)
                    // Unit may be wrongfully displayed on the grid, or just moved from one square to another, this align everything
                    delete this.units[x][y]
                    if (!this.units[unitNewPos.x]) {
                        this.units[unitNewPos.x] = {}
                    }
                    if (!this.units[unitNewPos.x][unitNewPos.y]) {
                        this.units[unitNewPos.x][unitNewPos.y] = [unit]
                    } else {
                        this.units[unitNewPos.x][unitNewPos.y].push(unit)
                    }
                } else if (isUpdatedUnit) {
                    this.updatedUnitsOnLastUpdate.push(unit)
                }

                players[unit.owner.id].incrementUnitCount(unit.life.getHP())
            } else if (units.length > 1) {
                const leftUnit = this.processUnitsOnSameTile(units)
                this.updatedUnitsOnLastUpdate.push(...units)

                if (leftUnit) {
                    leftUnit.update(map)
                    players[leftUnit.owner.id].incrementUnitCount(leftUnit.life.getHP())
                    this.units[x][y] = [leftUnit]
                } else {
                    delete this.units[x][y]
                }
            } else {
                // Zero units on this array, delete it to improve perf on iter
                delete this.units[x][y]
            }
        })
        return this.updatedUnitsOnLastUpdate
    }

    public updateTownsFromUnits(map: Map): Town[] {
        const towns = map.getTowns()
        const changedTowns: Town[] = []
        for (const town of towns) {
            const unitsOnTown = this.units[town.x] ? this.units[town.x][town.y] : null
            if (unitsOnTown && unitsOnTown.length) {
                const unit = unitsOnTown[0]
                if (town.player?.id !== unit.owner.id) {
                    changedTowns.push(town)
                    town.player = unit.owner
                    unit.life.takeDamage(1)
                    if (unit.life.getHP() === 0) {
                        delete this.units[town.x][town.y]
                    }
                }
            }
        }
        return changedTowns
    }

    public getUnits() {
        return this.units
    }

    // TODO : check zero life unit

    // Actions

    public addUnit(unit: BaseUnit, player: AbstractPlayer, x: number, y: number): BaseUnit | null {
        if (!this.units[x]) {
            this.units[x] = {}
        }
        if (this.units[x][y]) {
            const existingUnits = this.units[x][y]

            if (existingUnits.length === 1) {
                const existingUnit = existingUnits[0]
                if (existingUnit.owner.id === player.id) {
                    if (existingUnit.life.getHP() >= MAX_UNIT_LIFE) {
                        return null
                    }
                    existingUnit.life.heal(unit.life.getHP())
                    return existingUnit
                } else {
                    console.warn('This town does not belong to the user')
                    return null
                }
            } else if (existingUnits.length > 1) {
                console.log('More than one unit on this tile')
                return null
            } else {
                this.units[x][y].push(unit)
                return unit
            }
        } else {
            this.units[x][y] = [unit]
        }
        return unit
    }

    public unitAction(player: AbstractPlayer, action: UnitAction) {
        // TODO : rather than getting the unit ID, get the unit position from the frontend, faster and safer
        const unit = xyMapToArray<BaseUnit[]>(this.units).find((units) =>
            units.find((unit) => unit.id === action.unitId)
        )?.[0]
        if (unit) {
            unit.addAction(action)
        }
    }

    private processUnitsOnSameTile(units: BaseUnit[]): BaseUnit | null {
        const survivingUnits = units.reduce((acc: BaseUnit[], unit) => {
            acc.push(unit)

            if (acc.length === 2) {
                const firstUnit = acc[0]
                const secondUnit = acc[1]

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
                acc = acc.filter((accUnit) => accUnit.life.getHP()) // should be only one unit
            }

            return acc
        }, [])

        if (survivingUnits.length) {
            if (survivingUnits.length > 1) {
                console.warn('More than one unit after processing unit tiles', survivingUnits)
            }
            return survivingUnits[0]
        }

        return null
    }
}
