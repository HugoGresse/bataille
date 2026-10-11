/** Below this width the HUD panels would cover most of the map at full size */
const NARROW_SCREEN = 600

/** Read once at load: a phone keeps the compact HUD for the whole game, rotation included */
const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < NARROW_SCREEN

export const HUD_SCALE = isNarrowScreen ? 1.1 : 1.5

export const hudPx = (base: number): number => Math.round(base * HUD_SCALE)

export const hudFont = (basePx: number): string => `${hudPx(basePx)}px`
