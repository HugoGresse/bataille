'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.pickUnusedColor = void 0
var colors = ['0xFF0000', '0x6666FF', '0xFFFF00', '0x00FF00', '0x00FFFF', '0xFF00FF']
var pickUnusedColor = function (existingPlayers) {
    if (existingPlayers === void 0) {
        existingPlayers = []
    }
    var usedColors = existingPlayers.map(function (p) {
        return p.color
    })
    var availableColors = colors.filter(function (color) {
        return usedColors.indexOf(color) == -1
    })
    return availableColors[Math.floor(Math.random() * availableColors.length)]
}
exports.pickUnusedColor = pickUnusedColor
