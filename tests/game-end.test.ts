import { describe, expect, it, vi } from 'vitest'
import { messages, threeHumanGame } from './helpers/gameFixture'

describe('holding enough of the map', () => {
    it('is called by the loop the tick it happens, with the winner and the count', () => {
        vi.useFakeTimers()
        const { emitter, game, seats } = threeHumanGame()
        const alice = seats[0].player
        const target = game.getTownsToWin()

        alice.setTownCount(target - 1)
        vi.advanceTimersByTime(100)
        expect(game.getEndAnnouncement()).toBeNull()

        alice.setTownCount(target)
        vi.advanceTimersByTime(100)

        const call = `This game has been won by alice, holding ${target} of the ${game.getTownCount()} towns`
        expect(game.getEndAnnouncement()).toEqual({ result: call, winner: alice })
        expect(messages(emitter)).toContain(call)

        // The loop stopped there: the win is not announced again on later ticks
        vi.advanceTimersByTime(1000)
        expect(messages(emitter).filter((line) => line === call)).toHaveLength(1)
    })
})

describe('gameResults', () => {
    it('lists every seat with its account and who won', async () => {
        const { gameResults } = await import('../src/server/GameLoop')
        const { HumanPlayer } = await import('../src/server/model/player/HumanPlayer')
        const { IAPlayer } = await import('../src/server/model/player/IAPlayer')
        const alice = new HumanPlayer({} as never, '0xFF0000', 'Alice', 'tok', 'acc-alice')
        const guest = new HumanPlayer({} as never, '0x00FF00', 'Guest', 'tok2')
        const bot = new IAPlayer('0x0000FF', 'AI-1')
        const game = { getPlayers: () => [alice, guest, bot] } as never

        expect(gameResults(game, alice)).toEqual([
            { name: 'Alice', isAI: false, accountId: 'acc-alice', won: true },
            { name: 'Guest', isAI: false, won: false },
            { name: 'AI-1', isAI: true, won: false },
        ])
        expect(gameResults(game, undefined).every((r) => !r.won)).toBe(true)
    })
})
