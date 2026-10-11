import { describe, expect, it } from 'vitest'
import { Position } from '../src/server/model/actors/Position'
import { Velocity } from '../src/server/model/actors/Velocity'
import { SERVER_TICK_MS } from '../src/common/GameSettings'
import { SPEED_FACTOR, STICK_SPEED } from '../src/common/UNITS'
import { GameMap } from '../src/server/model/map/GameMap'

const openGround = { getTileAt: () => null } as unknown as GameMap
const velocity = new Velocity(STICK_SPEED)
const wait = SPEED_FACTOR / STICK_SPEED

describe('Position.msUntilNextStep', () => {
    it('lands on the first tick after the wait, counted from when the wait started', () => {
        const position = new Position(16, 16)
        position.move([48, 16], velocity, openGround, 1000) // starts the wait
        expect(position.msUntilNextStep(1000)).toBe((Math.floor(wait / SERVER_TICK_MS) + 1) * SERVER_TICK_MS)
        expect(position.msUntilNextStep(1000 + SERVER_TICK_MS)).toBe(Math.floor(wait / SERVER_TICK_MS) * SERVER_TICK_MS)
    })

    it('agrees with when the step actually lands, tick by tick', () => {
        const position = new Position(16, 16)
        let now = 0
        position.move([48, 16], velocity, openGround, now)
        const predicted = position.msUntilNextStep(now)
        let stepped = false
        while (!stepped) {
            now += SERVER_TICK_MS
            stepped = position.move([48, 16], velocity, openGround, now)
        }
        expect(now).toBe(predicted)
    })

    it('counts in the tick a unit waits before starting on the next tile', () => {
        const position = new Position(16, 16)
        let now = 0
        position.move([48, 16], velocity, openGround, now)
        while (!position.move([48, 16], velocity, openGround, (now += SERVER_TICK_MS))) {}
        const predicted = position.msUntilNextStep(now)
        const steppedAt = now
        position.move([80, 16], velocity, openGround, (now += SERVER_TICK_MS))
        while (!position.move([80, 16], velocity, openGround, (now += SERVER_TICK_MS))) {}
        expect(now - steppedAt).toBe(predicted)
    })

    it('times the next wait by the tile just stepped onto, not the one left behind', () => {
        // Deep water on the first column, open ground after it
        const coast = {
            getTileAt: (tileX: number) => ({ velocityFactor: tileX === 0 ? 0.2 : 1 }),
        } as unknown as GameMap
        const position = new Position(16, 16)
        let now = 0
        position.move([48, 16], velocity, coast, now)
        while (!position.move([48, 16], velocity, coast, (now += SERVER_TICK_MS))) {}
        const predicted = position.msUntilNextStep(now)
        const steppedAt = now
        while (!position.move([80, 16], velocity, coast, (now += SERVER_TICK_MS))) {}
        expect(now - steppedAt).toBe(predicted)
        expect(predicted).toBeLessThan(wait * 2) // open-ground pace, not the water's fivefold wait
    })
})
