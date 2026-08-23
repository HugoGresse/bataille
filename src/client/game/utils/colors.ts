/**
 * Player colors travel in two shapes: '0xRRGGBB' in player states and '#RRGGBB' in unit states.
 * Everything drawn with Phaser needs a number, everything drawn with text needs a css string.
 */
const HEX = /^[0-9a-f]{6}$/i

const digits = (color: string): string => color.trim().replace('0x', '').replace('#', '')

export const toColorNumber = (color: string | undefined, fallback = 0xffffff): number => {
    if (!color) {
        return fallback
    }
    const value = digits(color)
    return HEX.test(value) ? parseInt(value, 16) : fallback
}

export const toCssColor = (color: string | undefined, fallback = '#ffffff'): string => {
    if (!color) {
        return fallback
    }
    const value = digits(color)
    return HEX.test(value) ? `#${value}` : fallback
}

/** Same color, compared across both notations */
export const isSameColor = (a: string | undefined, b: string | undefined): boolean =>
    !!a && !!b && digits(a).toLowerCase() === digits(b).toLowerCase()

/** Blend towards black, for the shade under a counter rim */
export const darken = (color: number, amount: number): number => {
    const r = Math.round(((color >> 16) & 0xff) * (1 - amount))
    const g = Math.round(((color >> 8) & 0xff) * (1 - amount))
    const b = Math.round((color & 0xff) * (1 - amount))
    return (r << 16) | (g << 8) | b
}
