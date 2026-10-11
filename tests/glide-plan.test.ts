import { describe, expect, it } from 'vitest'
import { glidePlan, SETTLE_MS } from '../src/client/game/utils/glidePlan'
import { TILE_WIDTH_HEIGHT } from '../src/common/UNITS'

const T = TILE_WIDTH_HEIGHT
const A = { x: 16, y: 16 }
const B = { x: 16 + T, y: 16 }

describe('glidePlan', () => {
    it('heads for the next tile and lands as the server steps onto it', () => {
        expect(glidePlan(A, A, B, 600)).toEqual({ snapTo: null, via: null, to: B, ms: 600 })
    })

    it('keeps going from wherever the piece is mid-glide, without snapping back', () => {
        const halfway = { x: 16 + T / 2, y: 16 }
        expect(glidePlan(halfway, A, B, 300)).toEqual({ snapTo: null, via: null, to: B, ms: 300 })
    })

    it('goes back through its own tile when re-routed, instead of cutting the corner', () => {
        const halfwayEast = { x: 16 + T / 2, y: 16 }
        const north = { x: 16, y: 16 - T }
        expect(glidePlan(halfwayEast, A, north, 600).via).toEqual(A)
    })

    it('sets a piece that fell far behind back on its tile before gliding on', () => {
        const farBehind = { x: 16 - 3 * T, y: 16 }
        expect(glidePlan(farBehind, A, B, 600).snapTo).toEqual(A)
    })

    it('settles onto the server position once the stack stops', () => {
        const nearlyThere = { x: B.x - 1, y: B.y }
        expect(glidePlan(nearlyThere, B)).toEqual({ snapTo: null, via: null, to: B, ms: SETTLE_MS })
    })

    it('walks back from a tile it was heading for, rather than jumping', () => {
        const mostOfTheWay = { x: 16 + 0.8 * T, y: 16 }
        expect(glidePlan(mostOfTheWay, A).ms).toBeGreaterThan(300)
    })
})
