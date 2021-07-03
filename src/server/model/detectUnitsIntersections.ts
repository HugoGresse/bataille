import {Player} from './Player'
import {iterateOnXYMap, XYMapWithType} from '../utils/xyMapToArray'
import {BaseUnit} from './actors/units/BaseUnit'

/**
 * Detect unit collision to make them fight
 * 1. Make a XY array of units on a given square
 * 2. Take collision between only the two first units and reduce their life between each other
 * 3. Remove dead units
 */
export const detectUnitsIntersections = (players: { [id: string]: Player }) => {

    const unitsMaps: XYMapWithType<BaseUnit[]> = {}
    // 1.
    Object.values(players).forEach(player => {
        const units = player.getUnits()
        iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
                if(!unitsMaps[x]) {
                    unitsMaps[x] = {}
                }

                if(!unitsMaps[x][y]) {
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
    Object.keys(unitsMaps).map(Number).forEach(x => {
        Object
            .keys(unitsMaps[x])
            .map(Number)
            .forEach(y => {

                tempUnits = unitsMaps[x][y]
                if(tempUnits.length < 2) {
                    return
                }

                pastUnit = unitsMaps[x][y][0]
                    unit = unitsMaps[x][y][1]

                pastUnit.life.takeDamage(unit.damage)
                unit.life.takeDamage(pastUnit.damage)

            })
    })

    // 3.
    Object.values(players).forEach(player => {
        const units = player.getUnits()
        iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
            if(units[x][y].life.getHP() === 0){
                console.log("dead units removed")
                delete units[x][y]
            }
        })
    })

}