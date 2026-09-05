import { describe, expect, it } from 'vitest'
import { clampZoom, distanceBetween, MAX_ZOOM, MIN_ZOOM, pinchedZoom } from '../src/client/game/utils/pinchZoom'

describe('pinchedZoom', () => {
    it('scales the zoom by how much the fingers spread or closed', () => {
        expect(pinchedZoom(1, 100, 150)).toBeCloseTo(1.5)
        expect(pinchedZoom(1, 100, 50)).toBeCloseTo(0.5)
        expect(pinchedZoom(0.7, 80, 80)).toBeCloseTo(0.7)
    })

    it('is continuous: a spread followed by the same close lands back where it started', () => {
        const spread = pinchedZoom(0.7, 100, 130)
        expect(pinchedZoom(spread, 130, 100)).toBeCloseTo(0.7)
    })

    it('stops at the same bounds as the wheel', () => {
        expect(pinchedZoom(1.9, 100, 400)).toBe(MAX_ZOOM)
        expect(pinchedZoom(0.25, 400, 100)).toBe(MIN_ZOOM)
    })

    it('ignores a degenerate spread rather than dividing by it', () => {
        expect(pinchedZoom(0.7, 0, 100)).toBe(0.7)
        expect(pinchedZoom(0.7, 100, 0)).toBe(0.7)
    })
})

describe('clampZoom', () => {
    it('keeps any zoom inside the playable range', () => {
        expect(clampZoom(5)).toBe(MAX_ZOOM)
        expect(clampZoom(-1)).toBe(MIN_ZOOM)
        expect(clampZoom(0.7)).toBe(0.7)
    })
})

describe('distanceBetween', () => {
    it('is the straight line between two pointers', () => {
        expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
        expect(distanceBetween({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0)
    })
})
