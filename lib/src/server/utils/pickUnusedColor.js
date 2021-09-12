'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.pickUnusedColor = void 0
const colors = ['0xFF0000', '0x6666FF', '0xFFFF00', '0x00FF00', '0x00FFFF', '0xFF00FF']
const pickUnusedColor = (existingPlayers = []) => {
    const usedColors = existingPlayers.map((p) => p.color)
    const availableColors = colors.filter((color) => usedColors.indexOf(color) == -1)
    return availableColors[Math.floor(Math.random() * availableColors.length)]
}
exports.pickUnusedColor = pickUnusedColor
