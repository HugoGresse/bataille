'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.updatePlayerIncome = void 0
var Player_1 = require('./Player')
var Map_1 = require('./map/Map')
var updatePlayerIncome = function (townByCountries, currentPlayer, emitter) {
    var prevOwnedCountries = currentPlayer.ownedCountriesIds
    var ownedCountriesIds = []
    Object.keys(townByCountries).forEach(function (countryId) {
        var player
        var isCountryUnifiedUnderOnePlayer = true
        for (var _i = 0, _a = townByCountries[countryId]; _i < _a.length; _i++) {
            var town = _a[_i]
            if (!player) {
                player = town.player
                if (player.id !== currentPlayer.id) {
                    isCountryUnifiedUnderOnePlayer = false
                    break
                }
            } else if (town.player.id !== player.id || player instanceof Player_1.NeutralPlayer) {
                isCountryUnifiedUnderOnePlayer = false
                break
            }
        }
        if (isCountryUnifiedUnderOnePlayer && player) {
            ownedCountriesIds.push(countryId)
        }
    })
    if (prevOwnedCountries.length < ownedCountriesIds.length) {
        var capturedCountries = ownedCountriesIds.filter(function (x) {
            return !prevOwnedCountries.includes(x)
        })
        capturedCountries.forEach(function (id) {
            var countryInfo = Map_1.CountryIdToInfo[id]
            var countryName = countryInfo ? countryInfo.name + ' (+' + countryInfo.income + ')' : id
            emitter.emitMessage(countryName + ' was captured by ' + currentPlayer.name, currentPlayer)
        })
    }
    currentPlayer.updateIncome(ownedCountriesIds, emitter)
}
exports.updatePlayerIncome = updatePlayerIncome
