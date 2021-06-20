import {TownByCountries} from './types/TownByCountries'
import {NeutralPlayer, Player} from './Player'

export const updatePlayerIncome = (townByCountries: TownByCountries, currentPlayer: Player) => {
    const ownedCountriesIds: string[] = []

    Object.keys(townByCountries).forEach(countryId => {
        let player
        let isCountryUnifiedUnderOnePlayer = true

        for(const town of townByCountries[countryId]){
            if(!player){
                player = town.player
                if(player.id !== currentPlayer.id) {
                    isCountryUnifiedUnderOnePlayer = false
                    break
                }
            } else if(town.player.id !== player.id || (player instanceof NeutralPlayer)) {
                    isCountryUnifiedUnderOnePlayer = false
                    break
            }
        }
        if(isCountryUnifiedUnderOnePlayer && player) {
            ownedCountriesIds.push(countryId)
        }

    })

    currentPlayer.updateIncome(ownedCountriesIds)
}
