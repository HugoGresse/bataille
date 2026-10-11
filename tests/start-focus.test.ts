import { describe, expect, it } from 'vitest'
import {
    CLUSTER_RADIUS,
    densestCluster,
    MAX_START_ZOOM,
    MIN_START_ZOOM,
    startFocus,
} from '../src/client/game/utils/startFocus'

const PHONE = { width: 375, height: 690 }
const DESKTOP = { width: 1440, height: 800 }

describe('densestCluster', () => {
    it('keeps the towns that sit together and drops the stray one across the map', () => {
        const group = [
            { x: 1000, y: 1000 },
            { x: 1100, y: 1050 },
            { x: 1050, y: 1200 },
        ]
        const stray = { x: 4000, y: 5000 }
        expect(densestCluster([stray, ...group])).toEqual(group)
    })

    it('settles a tie on the first group, so every client frames the same view', () => {
        const a = { x: 0, y: 0 }
        const b = { x: CLUSTER_RADIUS * 4, y: 0 }
        expect(densestCluster([a, b])).toEqual([a])
    })

    it('is empty for nobody', () => {
        expect(densestCluster([])).toEqual([])
    })
})

describe('startFocus', () => {
    it('centres on the group', () => {
        const focus = startFocus(
            [
                { x: 1000, y: 1000 },
                { x: 1200, y: 1300 },
            ],
            DESKTOP
        )
        expect(focus?.x).toBe(1100)
        expect(focus?.y).toBe(1150)
    })

    it('zooms out far enough for the whole group to fit the screen', () => {
        const points = [
            { x: 1000, y: 1000 },
            { x: 1300, y: 1000 },
        ]
        const focus = startFocus(points, PHONE)!
        // Both towns land inside the view at that zoom
        const halfWidth = PHONE.width / focus.zoom / 2
        expect(focus.x - halfWidth).toBeLessThan(1000)
        expect(focus.x + halfWidth).toBeGreaterThan(1300)
    })

    it('does not dive in on a lone town, nor back out past readable on a sprawling group', () => {
        expect(startFocus([{ x: 1000, y: 1000 }], DESKTOP)?.zoom).toBe(MAX_START_ZOOM)
        const sprawl = Array.from({ length: 6 }, (_, i) => ({ x: 1000 + i * 70, y: 1000 + i * 70 }))
        expect(startFocus(sprawl, { width: 200, height: 200 })?.zoom).toBe(MIN_START_ZOOM)
    })

    it('has nothing to frame for a player without towns', () => {
        expect(startFocus([], PHONE)).toBeNull()
    })
})
