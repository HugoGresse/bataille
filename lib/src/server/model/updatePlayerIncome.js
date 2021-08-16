"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerIncome = void 0;
var Player_1 = require("./Player");
var updatePlayerIncome = function (townByCountries, currentPlayer) {
    var ownedCountriesIds = [];
    Object.keys(townByCountries).forEach(function (countryId) {
        var player;
        var isCountryUnifiedUnderOnePlayer = true;
        for (var _i = 0, _a = townByCountries[countryId]; _i < _a.length; _i++) {
            var town = _a[_i];
            if (!player) {
                player = town.player;
                if (player.id !== currentPlayer.id) {
                    isCountryUnifiedUnderOnePlayer = false;
                    break;
                }
            }
            else if (town.player.id !== player.id || player instanceof Player_1.NeutralPlayer) {
                isCountryUnifiedUnderOnePlayer = false;
                break;
            }
        }
        if (isCountryUnifiedUnderOnePlayer && player) {
            ownedCountriesIds.push(countryId);
        }
    });
    currentPlayer.updateIncome(ownedCountriesIds);
};
exports.updatePlayerIncome = updatePlayerIncome;
