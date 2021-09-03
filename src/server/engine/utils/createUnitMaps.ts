import { AbstractPlayer } from '../../model/player/AbstractPlayer'
import { iterateOnXYMap, XYMapWithType } from '../../utils/xyMapToArray'
import { BaseUnit } from '../../model/actors/units/BaseUnit'

export const createUnitMaps = (player: AbstractPlayer[]): XYMapWithType<BaseUnit[]> => {
    const unitsMaps: XYMapWithType<BaseUnit[]> = {}

    player.forEach((player) => {
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

    return unitsMaps
}
