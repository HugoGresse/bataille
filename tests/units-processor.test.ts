import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_UNIT_LIFE } from '../src/common/UNITS'
import { UnitsProcessor } from '../src/server/engine/UnitsProcessor'
import { GameMap } from '../src/server/model/map/GameMap'
import { IAPlayer } from '../src/server/model/player/IAPlayer'
import { StickUnit } from '../src/server/model/actors/units/StickUnit'
import { Position } from '../src/server/model/actors/Position'
import {
    gridUnitAt,
    makePlayer,
    makeWalkableMap,
    orderMove,
    runTicksUntilRegisteredAt,
    spawnUnit,
    TILE,
    tick,
} from './helpers'

describe('UnitsProcessor', () => {
    let map: GameMap
    let p1: IAPlayer
    let p2: IAPlayer
    let players: IAPlayer[]
    let processor: UnitsProcessor

    beforeEach(() => {
        vi.useFakeTimers()
        map = makeWalkableMap()
        p1 = makePlayer('P1', '0xFF0000')
        p2 = makePlayer('P2', '0x00FF00')
        players = [p1, p2]
        processor = new UnitsProcessor()
    })

    describe('addUnit', () => {
        it('places a unit on an empty tile', () => {
            const unit = spawnUnit(processor, p1, 2, 2, 5)
            expect(gridUnitAt(processor, 2, 2)).toBe(unit)
            expect(unit.life.getHP()).toBe(5)
        })

        it('merges allied stacks created on the same tile', () => {
            const first = spawnUnit(processor, p1, 2, 2, 10)
            const second = spawnUnit(processor, p1, 2, 2, 5)

            // only the first stack remains registered, grown by the second one's hp
            expect(gridUnitAt(processor, 2, 2)).toBe(first)
            expect(first.life.getHP()).toBe(15)
        })

        it('refuses to grow a stack that is already at MAX_UNIT_LIFE', () => {
            spawnUnit(processor, p1, 2, 2, MAX_UNIT_LIFE)
            const rejected = new StickUnit(p1, new Position(2 * TILE + TILE / 2, 2 * TILE + TILE / 2), 5)
            expect(processor.addUnit(rejected, p1, 2, 2)).toBeNull()
            expect(gridUnitAt(processor, 2, 2)?.life.getHP()).toBe(MAX_UNIT_LIFE)
        })

        it('trims a merge to the room left rather than overshooting the cap', () => {
            spawnUnit(processor, p1, 2, 2, MAX_UNIT_LIFE - 4)
            const joining = new StickUnit(p1, new Position(2 * TILE + TILE / 2, 2 * TILE + TILE / 2), 10)

            const created = processor.addUnit(joining, p1, 2, 2)

            expect(created?.added).toBe(4)
            expect(gridUnitAt(processor, 2, 2)?.life.getHP()).toBe(MAX_UNIT_LIFE)
        })

        it('caps a stack raised on an empty tile too', () => {
            const oversized = new StickUnit(
                p1,
                new Position(2 * TILE + TILE / 2, 2 * TILE + TILE / 2),
                MAX_UNIT_LIFE + 150
            )

            const created = processor.addUnit(oversized, p1, 2, 2)

            expect(created?.added).toBe(MAX_UNIT_LIFE)
            expect(gridUnitAt(processor, 2, 2)?.life.getHP()).toBe(MAX_UNIT_LIFE)
        })
    })

    describe('stack splitting (unitAction amount)', () => {
        it('splits the stack when the requested amount is lower than its size', () => {
            const mover = spawnUnit(processor, p1, 5, 5, 10)
            orderMove(processor, p1, mover, 9, 5, 4)

            expect(mover.life.getHP()).toBe(4)
            expect(mover.pendingRemnant?.life.getHP()).toBe(6)
            // the remnant is not registered yet: the tile still belongs to the moving part
            expect(gridUnitAt(processor, 5, 5)).toBe(mover)
        })

        it('moves the whole stack when no amount is provided or amount >= hp', () => {
            const moverA = spawnUnit(processor, p1, 5, 5, 10)
            orderMove(processor, p1, moverA, 9, 5)
            expect(moverA.pendingRemnant).toBeNull()
            expect(moverA.life.getHP()).toBe(10)

            const moverB = spawnUnit(processor, p1, 15, 5, 10)
            orderMove(processor, p1, moverB, 19, 5, 99)
            expect(moverB.pendingRemnant).toBeNull()
            expect(moverB.life.getHP()).toBe(10)
        })

        it('ignores invalid amounts (<= 0)', () => {
            const mover = spawnUnit(processor, p1, 5, 5, 10)
            orderMove(processor, p1, mover, 9, 5, 0)
            expect(mover.pendingRemnant).toBeNull()
            expect(mover.life.getHP()).toBe(10)
        })

        it('drops the remnant into the vacated tile once the mover departs', () => {
            const mover = spawnUnit(processor, p1, 5, 5, 10)
            orderMove(processor, p1, mover, 9, 5, 4)
            const remnant = mover.pendingRemnant!

            runTicksUntilRegisteredAt(processor, map, players, mover, { x: 6, y: 5 })

            expect(gridUnitAt(processor, 5, 5)?.id).toBe(remnant.id)
            expect(gridUnitAt(processor, 5, 5)?.life.getHP()).toBe(6)
            expect(gridUnitAt(processor, 6, 5)?.id).toBe(mover.id)
            expect(mover.pendingRemnant).toBeNull()
        })
    })

    describe('collisions on tile entry', () => {
        it('a traveling stack crossing an allied tile does not merge with it', () => {
            const ally = spawnUnit(processor, p1, 6, 5, 3)
            const mover = spawnUnit(processor, p1, 5, 5, 5)
            orderMove(processor, p1, mover, 9, 5)

            // mover hops over the allied tile on its way to (9,5)
            runTicksUntilRegisteredAt(processor, map, players, mover, { x: 7, y: 5 })

            expect(gridUnitAt(processor, 6, 5)?.id).toBe(ally.id)
            expect(ally.life.getHP()).toBe(3)
            expect(mover.life.getHP()).toBe(5)

            // and it keeps going to its destination without side effects
            runTicksUntilRegisteredAt(processor, map, players, mover, { x: 9, y: 5 })
            expect(gridUnitAt(processor, 6, 5)?.id).toBe(ally.id)
        })

        it('a stack ending its journey on an allied tile merges with it', () => {
            const ally = spawnUnit(processor, p1, 6, 5, 3)
            const mover = spawnUnit(processor, p1, 5, 5, 5)
            orderMove(processor, p1, mover, 6, 5)

            // wait for the merge to happen (resident stack reaches 8 hp)
            for (let i = 0; i < 30 && gridUnitAt(processor, 6, 5)?.life.getHP() !== 8; i++) {
                tick(processor, map, players)
            }

            const resident = gridUnitAt(processor, 6, 5)
            expect(resident?.id).toBe(ally.id)
            expect(resident?.life.getHP()).toBe(8)
        })

        it('a stack entering an enemy tile fights it to the death', () => {
            const enemy = spawnUnit(processor, p2, 6, 5, 5)
            const mover = spawnUnit(processor, p1, 5, 5, 2)
            orderMove(processor, p1, mover, 9, 5)

            // wait for the fight (enemy takes the mover's 2 hp)
            for (let i = 0; i < 30 && gridUnitAt(processor, 6, 5)?.life.getHP() !== 3; i++) {
                tick(processor, map, players)
            }

            // enemy took 2 damage (mover hp), mover took 5 (enemy hp) and died
            expect(gridUnitAt(processor, 6, 5)?.id).toBe(enemy.id)
            expect(enemy.life.getHP()).toBe(3)
        })
    })
})
