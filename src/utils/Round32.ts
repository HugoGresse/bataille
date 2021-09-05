import { TILE_WIDTH_HEIGHT } from '../common/UNITS'

export const round32 = (value: number) => Math.floor(value / TILE_WIDTH_HEIGHT)
