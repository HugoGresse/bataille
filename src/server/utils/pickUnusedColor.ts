import { AbstractPlayer } from '../model/player/AbstractPlayer'

const colors = ['0xFF0000', '0x3333FF', '0xFFFF00', '0xFF0000', '0x00FFFF', '0xFF00FF']

export const pickUnusedColor = (existingPlayers: AbstractPlayer[] = []) => {
    const usedColors = existingPlayers.map((p) => p.color)
    const availableColors = colors.filter((color) => usedColors.indexOf(color) == -1)
    return availableColors[Math.floor(Math.random() * availableColors.length)]
}
