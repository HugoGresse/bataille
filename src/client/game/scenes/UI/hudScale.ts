export const HUD_SCALE = 1.5

export const hudPx = (base: number): number => Math.round(base * HUD_SCALE)

export const hudFont = (basePx: number): string => `${hudPx(basePx)}px`
