import {Player} from '../model/Player'
import {Map} from '../model/map/Map'
import {shuffleArray} from '../../utils/shuffleArray'

export const townAssignation = (players: Player[], map: Map) =>  {
    const towns = map.getTowns()

    const townByPlayer = Math.floor(towns.length / players.length)

    const shuffledTowns = shuffleArray(towns)
    // Only let 1/3 of the towns to be assigned to player at start
    const availableTowns = shuffledTowns.splice(0, shuffledTowns.length / 3)

    let i = 0

    for(const town of availableTowns) {
        town.player = players[i]
        town.isNeutral = false
        if(i >= townByPlayer){
            i += 1
        }
    }
}
