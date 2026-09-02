export const BUILDING_TOWN = 'b-town'

export const UNIT_STICK = 'u-stick'

export const TILE_WIDTH_HEIGHT = 32
export const TILE_WIDTH_HEIGHT_HALF = TILE_WIDTH_HEIGHT / 2

export enum UnitsType {
    Stick = 1,
    Bar = 2,
    Medic = 3,
    Wheelie = 4,
}

export const MAX_UNIT_LIFE = 100

/**
 * How many units can still join a stack: stacks are capped, so a muster that would overflow one
 * raises only what fits. Both sides use this, so the ring never offers what the server would drop.
 */
export const roomInStack = (currentHP: number, wanted: number): number =>
    Math.max(0, Math.min(wanted, MAX_UNIT_LIFE - currentHP))
