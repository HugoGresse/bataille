import { describe, expect, it } from 'vitest'
import { chooseHeading, fanPoint, headingCost, RingGeometry } from '../src/client/game/scenes/UI/ringHeading'

const GEOMETRY: RingGeometry = { spread: [-52, 0, 52], arcRadius: 92, satRadius: 25, capHeight: 16 }
const VIEW = { width: 800, height: 600 }
const CITY = { x: 400, y: 300 }

describe('fanPoint', () => {
    it('measures angles clockwise from straight up', () => {
        expect(fanPoint(CITY, 0, 100)).toEqual({ x: 400, y: 200 })
        const right = fanPoint(CITY, 90, 100)
        expect(right.x).toBeCloseTo(500)
        expect(right.y).toBeCloseTo(300)
    })
})

describe('chooseHeading', () => {
    it('opens above the city when nothing is in the way', () => {
        expect(chooseHeading(CITY, [], VIEW, GEOMETRY)).toBe(0)
    })

    it('turns away from a town the fan would sit on', () => {
        const townAbove = fanPoint(CITY, 0, GEOMETRY.arcRadius)
        const heading = chooseHeading(CITY, [townAbove], VIEW, GEOMETRY)
        expect(headingCost(heading, CITY, [townAbove], VIEW, GEOMETRY)).toBe(0)
        expect(heading).not.toBe(0)
    })

    it('swings inwards rather than run off the edge of the screen', () => {
        const nearTopLeft = { x: 60, y: 50 }
        const heading = chooseHeading(nearTopLeft, [], VIEW, GEOMETRY)
        expect(headingCost(heading, nearTopLeft, [], VIEW, GEOMETRY)).toBe(0)
        expect(heading).toBe(135)
    })

    it('keeps the current heading when nothing beats it, so the fan does not flutter', () => {
        expect(chooseHeading(CITY, [], VIEW, GEOMETRY, 180)).toBe(180)
    })
})
