import { Player } from './Player'
import { iterateOnXYMap, XYMapWithType } from '../utils/xyMapToArray'
import { BaseUnit } from './actors/units/BaseUnit'
import { getKeys } from '../utils/getKeys'

/**
 * Detect unit collision to make them fight
 * 1. Make a XY array of units on a given square
 * 2. Take collision between only the two first units and reduce their life between each other
 * 3. Remove dead units
 */
export const detectUnitsIntersections = (players: { [id: string]: Player }) => {
    const unitsMaps: XYMapWithType<BaseUnit[]> = {}
    const playersValues = Object.values(players)
    // 1.
    playersValues.forEach((player) => {
        const units = player.getUnits()
        iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
            if (!unitsMaps[x]) {
                unitsMaps[x] = {}
            }

            if (!unitsMaps[x][y]) {
                unitsMaps[x][y] = [unit]
            } else {
                unitsMaps[x][y].push(unit)
            }
        })
    })

    // 2.
    let tempUnits = null
    let unit = null
    let pastUnit = null
    let pastUnitLife = 0
    let currentUnitLife = 0
    getKeys(unitsMaps).forEach((x) => {
        getKeys(unitsMaps[x]).forEach((y) => {
            tempUnits = unitsMaps[x][y]
            if (tempUnits.length < 2) {
                return
            }

            pastUnit = unitsMaps[x][y][0]
            unit = unitsMaps[x][y][1]

            pastUnitLife = pastUnit.life.getHP()
            currentUnitLife = unit.life.getHP()

            pastUnit.life.takeDamage(unit.damage * currentUnitLife)
            unit.life.takeDamage(pastUnit.damage * pastUnitLife)
        })
    })

    // 3.
    playersValues.forEach((player) => {
        const units = player.getUnits()
        iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
            if (units[x][y].life.getHP() <= 0) {
                delete units[x][y]
            }
        })
    })
}
