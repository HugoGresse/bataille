import { describe, expect, it } from 'vitest'
import { lossLabel, placeMarker, shouldMerge } from '../src/client/game/scenes/UI/lossMarkerGeometry'

describe('placeMarker', () => {
    const width = 1000
    const height = 600
    const margin = 30

    it('leaves a town that is in view where it is', () => {
        const placement = placeMarker({ x: 520, y: 310 }, width, height, margin)
        expect(placement.onScreen).toBe(true)
        expect(placement.position).toEqual({ x: 520, y: 310 })
    })

    it('pulls an off-screen town onto the inset edge, keeping its bearing', () => {
        const placement = placeMarker({ x: 3000, y: 300 }, width, height, margin)
        expect(placement.onScreen).toBe(false)
        expect(placement.position.x).toBeCloseTo(width - margin)
        expect(placement.position.y).toBeCloseTo(height / 2)
        expect(placement.angle).toBeCloseTo(0)
    })

    it('points at the true bearing rather than the nearest side', () => {
        // 600 left and 600 up from the centre: a true diagonal
        const upLeft = placeMarker({ x: -100, y: -300 }, width, height, margin)
        expect(upLeft.onScreen).toBe(false)
        expect(upLeft.angle).toBeCloseTo(-135, 0)
        // The top edge is reached first on this wider-than-tall viewport, and the marker stays on
        // the diagonal rather than being snapped to a corner
        expect(upLeft.position.y).toBeCloseTo(margin)
        expect(upLeft.position.x).toBeCloseTo(230)
    })

    it('treats a town just outside the margin as off-screen', () => {
        const inside = placeMarker({ x: width - margin - 5, y: height / 2 }, width, height, margin)
        const outside = placeMarker({ x: width - margin + 5, y: height / 2 }, width, height, margin)
        expect(inside.onScreen).toBe(true)
        expect(outside.onScreen).toBe(false)
    })
})

describe('shouldMerge', () => {
    it('merges losses from the same direction moments apart', () => {
        expect(shouldMerge({ angle: 40, at: 1000 }, { angle: 52, at: 2000 })).toBe(true)
    })

    it('keeps separate directions apart', () => {
        expect(shouldMerge({ angle: 40, at: 1000 }, { angle: 120, at: 1200 })).toBe(false)
    })

    it('keeps distant moments apart even in the same direction', () => {
        expect(shouldMerge({ angle: 40, at: 1000 }, { angle: 41, at: 9000 })).toBe(false)
    })

    it('wraps around the -180/180 seam', () => {
        expect(shouldMerge({ angle: 179, at: 1000 }, { angle: -175, at: 1500 })).toBe(true)
    })
})

describe('lossLabel', () => {
    it('names the town, and prices the loss only when income moved', () => {
        expect(lossLabel('Lyon', 2, 0)).toBe('LYON −2/TURN')
        expect(lossLabel('Lyon', 0, 0)).toBe('LYON')
    })

    it('counts the rest in once several losses merge', () => {
        expect(lossLabel('Lyon', 2, 3)).toBe('LYON +3 MORE')
    })
})
