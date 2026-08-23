import { describe, expect, it, vi } from 'vitest'
import { ActionsProcessor } from '../src/server/engine/ActionsProcessor'
import { UnitsProcessor } from '../src/server/engine/UnitsProcessor'
import { GameMap } from '../src/server/model/map/GameMap'
import { gridUnitAt, makePlayer, spawnUnit } from './helpers'
import { MAX_UNIT_LIFE } from '../src/common/UNITS'
import { AbstractPlayer } from '../src/server/model/player/AbstractPlayer'

const ownedTownMap = (owner: AbstractPlayer): GameMap =>
    ({
        getTileAt: () => ({ player: owner }),
    }) as unknown as GameMap

describe('ActionsProcessor.addUnit', () => {
    it('creates a stack worth the paid amount on an owned town', () => {
        const p1 = makePlayer('P1')
        const processor = new ActionsProcessor(ownedTownMap(p1), new UnitsProcessor())

        const unit = processor.addUnit(p1, { x: 3 * 32, y: 4 * 32, unitCount: 3 })

        expect(unit).not.toBeNull()
        expect(unit?.life.getHP()).toBe(3)
        expect(p1.money).toBe(1) // started at 4, spent 3
    })

    it('spends only what the player can afford', () => {
        const p1 = makePlayer('P1')
        const processor = new ActionsProcessor(ownedTownMap(p1), new UnitsProcessor())
        p1.money = 2

        const unit = processor.addUnit(p1, { x: 3 * 32, y: 4 * 32, unitCount: 10 })

        expect(unit?.life.getHP()).toBe(2)
        expect(p1.money).toBe(0)
    })

    it('reinforces the stack already parked on the town instead of creating a second one', () => {
        const p1 = makePlayer('P1')
        const unitsProcessor = new UnitsProcessor()
        const processor = new ActionsProcessor(ownedTownMap(p1), unitsProcessor)
        p1.money = 20
        const garrison = spawnUnit(unitsProcessor, p1, 3, 4, 5)

        const unit = processor.addUnit(p1, { x: 3 * 32, y: 4 * 32, unitCount: 6 })

        expect(unit).toBe(garrison) // same stack, grown
        expect(garrison.life.getHP()).toBe(11)
        expect(p1.money).toBe(14)
        expect(gridUnitAt(unitsProcessor, 3, 4)).toBe(garrison)
    })

    it('does not charge the player when the parked stack is already at max size', () => {
        const p1 = makePlayer('P1')
        const unitsProcessor = new UnitsProcessor()
        const processor = new ActionsProcessor(ownedTownMap(p1), unitsProcessor)
        p1.money = 20
        spawnUnit(unitsProcessor, p1, 3, 4, MAX_UNIT_LIFE)

        expect(processor.addUnit(p1, { x: 3 * 32, y: 4 * 32, unitCount: 5 })).toBeNull()
        expect(p1.money).toBe(20)
    })

    it('refuses to create a unit on a town owned by someone else', () => {
        const p1 = makePlayer('P1')
        const p2 = makePlayer('P2', '0x00FF00')
        const processor = new ActionsProcessor(ownedTownMap(p2), new UnitsProcessor())

        const unit = processor.addUnit(p1, { x: 3 * 32, y: 4 * 32, unitCount: 1 })

        expect(unit).toBeNull()
        expect(p1.money).toBe(4)
    })
})
