import { describe, expect, it, vi } from 'vitest'
import { GameMap } from '../src/server/model/map/GameMap'
import { UnitsProcessor } from '../src/server/engine/UnitsProcessor'
import { GameUpdateProcessor } from '../src/server/engine/GameUpdateProcessor'
import { IncomeDispatcher } from '../src/server/model/income/IncomeDispatcher'
import { surrenderPlayer } from '../src/server/engine/surrender'
import { NeutralPlayerInstance } from '../src/server/model/player/NeutralPlayer'
import { MONEY_INCOME_START, INCOME_MS } from '../src/common/GameSettings'
import { gridUnitAt, makePlayer, makeWalkableMap, spawnUnit, toPlayersById } from './helpers'
import { SocketEmitter } from '../src/server/SocketEmitter'

const fakeEmitter = () =>
    ({
        emitMessage: vi.fn(),
        emitMessageToSpecificPlayer: vi.fn(),
        emitLobbyState: vi.fn(),
        emitInitialGameState: vi.fn(),
        emitGameUpdate: vi.fn(),
    }) as never as SocketEmitter

/** Hands the first `count` towns of one country to the player, so they hold it outright */
const giveCountry = (map: GameMap, player: ReturnType<typeof makePlayer>, countryIndex: number) => {
    const byCountry = map.getTownsByCountries()
    const countryId = Object.keys(byCountry).filter((id) => byCountry[id].length >= 2)[countryIndex]
    for (const town of byCountry[countryId]) {
        town.player = player
        town.isNeutral = false
    }
    return byCountry[countryId]
}

describe('surrenderPlayer', () => {
    const map = new GameMap()

    it('disbands the army, frees the towns and zeroes the income, leaving others untouched', () => {
        const leaver = makePlayer('Leaver', '0xFF0000')
        const rival = makePlayer('Rival', '0x00FF00')
        const emitter = fakeEmitter()
        const processor = new UnitsProcessor()
        const leaverTowns = giveCountry(map, leaver, 0)
        const rivalTowns = giveCountry(map, rival, 1)
        for (const player of [leaver, rival]) {
            player.updateIncome(
                Object.keys(map.getTownsByCountries()).filter((id) =>
                    map.getTownsByCountries()[id].every((town) => town.player?.id === player.id)
                ),
                emitter
            )
        }
        const leaverIncome = leaver.income
        const rivalIncome = rival.income
        expect(leaverIncome).toBeGreaterThan(MONEY_INCOME_START)

        const first = leaverTowns[0]
        const armyAtHome = spawnUnit(processor, leaver, first.x, first.y, 12)
        const armyAfield = spawnUnit(processor, leaver, 3, 3, 5)
        const rivalArmy = spawnUnit(processor, rival, rivalTowns[0].x, rivalTowns[0].y, 7)

        const outcome = surrenderPlayer(leaver, map, processor, [leaver, rival], emitter)

        expect(outcome).not.toBeNull()
        expect(outcome!.deletedUnits.map((unit) => unit.id).sort()).toEqual([armyAtHome.id, armyAfield.id].sort())
        expect(gridUnitAt(processor, first.x, first.y)).toBeUndefined()
        expect(gridUnitAt(processor, 3, 3)).toBeUndefined()
        expect(gridUnitAt(processor, rivalTowns[0].x, rivalTowns[0].y)).toBe(rivalArmy)

        expect(outcome!.changedTowns).toHaveLength(leaverTowns.length)
        for (const town of leaverTowns) {
            expect(town.player).toBe(NeutralPlayerInstance)
            expect(town.isNeutral).toBe(true)
        }
        expect(outcome!.changedTowns[0].p?.n).toBe('Neutral')
        expect(rivalTowns.every((town) => town.player === rival)).toBe(true)

        expect(leaver.hasSurrendered).toBe(true)
        expect(leaver.isOut).toBe(true)
        expect(leaver.isDead).toBe(false)
        expect(leaver.income).toBe(0)
        expect(leaver.ownedCountriesIds).toEqual([])
        expect(leaver.getPublicPlayerState().s).toBe(true)
        expect(rival.income).toBe(rivalIncome)
        expect(rival.isOut).toBe(false)
    })

    it('is a no-op the second time, and for someone already eliminated', () => {
        const leaver = makePlayer('Leaver')
        const processor = new UnitsProcessor()
        const emitter = fakeEmitter()

        expect(surrenderPlayer(leaver, map, processor, [leaver], emitter)).not.toBeNull()
        expect(surrenderPlayer(leaver, map, processor, [leaver], emitter)).toBeNull()

        const dead = makePlayer('Dead')
        dead.isDead = true
        expect(surrenderPlayer(dead, map, processor, [dead], emitter)).toBeNull()
        expect(dead.hasSurrendered).toBe(false)
    })

    it('never announces the leaver as dead afterwards', () => {
        const leaver = makePlayer('Leaver')
        const emitter = fakeEmitter()
        surrenderPlayer(leaver, map, new UnitsProcessor(), [leaver], emitter)

        // What a later tick does once a town somewhere changes hands
        leaver.setUnitCount(0)
        leaver.updateIncome([], emitter)

        expect(leaver.isDead).toBe(false)
        expect(emitter.emitMessage).not.toHaveBeenCalled()
    })
})

describe('GameUpdateProcessor carries out-of-tick changes', () => {
    it('broadcasts enqueued deletions and towns on the next run, and only that once', () => {
        vi.useFakeTimers()
        const p1 = makePlayer('P1')
        const unitsProcessor = new UnitsProcessor()
        vi.spyOn(unitsProcessor, 'updateUnits').mockReturnValue({ updatedUnits: [], deletedUnits: [] })
        const processor = new GameUpdateProcessor(
            makeWalkableMap(),
            toPlayersById([p1]),
            fakeEmitter(),
            unitsProcessor,
            new IncomeDispatcher(INCOME_MS)
        )
        const deleted = { id: 'gone', hp: 0, p: { x: 0, y: 0 }, c: '0xFF0000' }
        const town = { id: 'town', isT: true, p: { n: 'Neutral', c: '0x888888' } }

        processor.enqueue({ deletedUnits: [deleted], changedTowns: [town] })
        processor.run()
        expect(processor.getLastDeletedUnitsStates()).toEqual([deleted])
        expect(processor.getLastTownsStates()).toEqual([town])

        processor.run()
        expect(processor.getLastDeletedUnitsStates()).toEqual([])
        expect(processor.getLastTownsStates()).toEqual([])
    })
})
