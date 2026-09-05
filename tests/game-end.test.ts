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
