import { describe, expect, it, vi } from 'vitest'
import { Socket } from 'socket.io'
import { GameUpdateProcessor } from '../src/server/engine/GameUpdateProcessor'
import { UnitsProcessor } from '../src/server/engine/UnitsProcessor'
import { IncomeDispatcher } from '../src/server/model/income/IncomeDispatcher'
import { IAPlayer } from '../src/server/model/player/IAPlayer'
import { HumanPlayer } from '../src/server/model/player/HumanPlayer'
import { makePlayer } from './helpers'
import { INCOME_MS } from '../src/common/GameSettings'

const fakeEmitter = () =>
    ({
        emitMessage: vi.fn(),
        emitMessageToSpecificPlayer: vi.fn(),
        emitLobbyState: vi.fn(),
        emitInitialGameState: vi.fn(),
        emitGameUpdate: vi.fn(),
    }) as never as import('../src/server/SocketEmitter').SocketEmitter

describe('IncomeDispatcher', () => {
    it('dispatches income to every player once the interval elapsed', () => {
        vi.useFakeTimers()
        const p1 = makePlayer('P1')
        p1.income = 7
        const dispatcher = new IncomeDispatcher(INCOME_MS)

        expect(dispatcher.update([p1])).toBe(false)
        vi.advanceTimersByTime(INCOME_MS + 1)
        expect(dispatcher.update([p1])).toBe(true)
        expect(p1.money).toBe(4 + 7)
        // second call within the same interval does nothing
        expect(dispatcher.update([p1])).toBe(false)
        expect(p1.money).toBe(4 + 7)
    })

    it('counts down to the next income', () => {
        vi.useFakeTimers()
        const dispatcher = new IncomeDispatcher(INCOME_MS)
        const before = dispatcher.getNextIncomeDelay()
        vi.advanceTimersByTime(2000)
        const after = dispatcher.getNextIncomeDelay()
        expect(after).toBeLessThan(before)
        expect(after).toBeLessThanOrEqual(INCOME_MS / 1000)
    })
})

describe('AbstractPlayer death notice', () => {
    it('broadcasts the death of a human player', () => {
        const emitter = fakeEmitter()
        const player = new HumanPlayer({} as never, '0xFF0000', 'Human')
        player.updateIncome([], emitter)
        expect(player.isDead).toBe(true)
        expect(emitter.emitMessage).toHaveBeenCalledWith('Player is dead: Human', player)
    })

    it('does not broadcast the death of an AI player (self-kill spam)', () => {
        const emitter = fakeEmitter()
        const ai = new IAPlayer('0x00FF00', 'AI-1')
        ai.updateIncome([], emitter)
        expect(ai.isDead).toBe(true)
        expect(emitter.emitMessage).not.toHaveBeenCalled()
    })
})

describe('GameUpdateProcessor (server loop step)', () => {
    it('runs units update, town update and income dispatch', () => {
        vi.useFakeTimers()
        const p1 = makePlayer('P1')
        p1.income = 3
        const playersById = { [p1.id]: p1 }

        const unitsProcessor = new UnitsProcessor()
        const updateUnitsSpy = vi.spyOn(unitsProcessor, 'updateUnits').mockReturnValue({ updatedUnits: [], deletedUnits: [] })
        const updateTownsSpy = vi.spyOn(unitsProcessor, 'updateTownsFromUnits').mockReturnValue({
            towns: [],
            updatedUnits: [],
            deletedUnits: [],
        })

        const processor = new GameUpdateProcessor(
            { getTownsByCountries: () => ({}) } as never, // map not used with the stubs above
            playersById,
            fakeEmitter(),
            unitsProcessor,
            new IncomeDispatcher(INCOME_MS)
        )

        processor.run()
        expect(updateUnitsSpy).toHaveBeenCalledOnce()
        // no unit moved -> towns are not reprocessed
        expect(updateTownsSpy).not.toHaveBeenCalled()
        expect(p1.money).toBe(4)

        vi.advanceTimersByTime(INCOME_MS + 1)
        processor.run()
        expect(p1.money).toBe(4 + 3)
    })
})
