import { TownByCountries } from '../model/types/TownByCountries'
import { SocketEmitter } from '../SocketEmitter'
import { CountryIdToInfo } from '../model/map/Map'
import { NeutralPlayer } from '../model/player/NeutralPlayer'
import { AbstractPlayer } from '../model/player/AbstractPlayer'

export const updatePlayerIncome = (
    townByCountries: TownByCountries,
    currentPlayer: AbstractPlayer,
    emitter: SocketEmitter
) => {
    const prevOwnedCountries = currentPlayer.ownedCountriesIds
    const ownedCountriesIds: string[] = []

    Object.keys(townByCountries).forEach((countryId) => {
        let player
        let isCountryUnifiedUnderOnePlayer = true

        for (const town of townByCountries[countryId]) {
            if (!player) {
                player = town.player
                if (player.id !== currentPlayer.id) {
                    isCountryUnifiedUnderOnePlayer = false
                    break
                }
            } else if (town.player.id !== player.id || player instanceof NeutralPlayer) {
                isCountryUnifiedUnderOnePlayer = false
                break
            }
        }
        if (isCountryUnifiedUnderOnePlayer && player) {
            ownedCountriesIds.push(countryId)
        }
    })

    if (prevOwnedCountries.length < ownedCountriesIds.length) {
        const capturedCountries = ownedCountriesIds.filter((x) => !prevOwnedCountries.includes(x))
        capturedCountries.forEach((id) => {
            const countryInfo = CountryIdToInfo[id]
            const countryName = countryInfo ? `${countryInfo.name} (+${countryInfo.income})` : id
            emitter.emitMessage(`${countryName} was captured by ${currentPlayer.name}`, currentPlayer)
        })
    }

    currentPlayer.updateIncome(ownedCountriesIds, emitter)
}
