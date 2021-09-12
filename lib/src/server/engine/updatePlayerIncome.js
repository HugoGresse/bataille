'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.updatePlayerIncome = void 0
const GameMap_1 = require('../model/map/GameMap')
const NeutralPlayer_1 = require('../model/player/NeutralPlayer')
const updatePlayerIncome = (townByCountries, currentPlayer, emitter) => {
    const prevOwnedCountries = currentPlayer.ownedCountriesIds
    const ownedCountriesIds = []
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
            } else if (town.player.id !== player.id || player instanceof NeutralPlayer_1.NeutralPlayer) {
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
            const countryInfo = GameMap_1.CountryIdToInfo[id]
            const countryName = countryInfo ? `${countryInfo.name} (+${countryInfo.income})` : id
            emitter.emitMessage(`${countryName} was captured by ${currentPlayer.name}`, currentPlayer)
        })
    }
    currentPlayer.updateIncome(ownedCountriesIds, emitter)
}
exports.updatePlayerIncome = updatePlayerIncome
