import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from '../src/server/Game'
import { HumanPlayer } from '../src/server/model/player/HumanPlayer'
import { SocketEmitter } from '../src/server/SocketEmitter'
import { RECONNECT_GRACE_MS } from '../src/common/GameSettings'
import { findLiveSeat, findSeat } from '../src/server/seats'
import { Socket } from 'socket.io'

const fakeEmitter = () =>
    ({
        emitMessage: vi.fn(),
        emitMessageToSpecificPlayer: vi.fn(),
        emitLobbyState: vi.fn(),
        emitInitialGameState: vi.fn(),
        emitInitialGameStateTo: vi.fn(),
        emitGameUpdate: vi.fn(),
    }) as never as SocketEmitter

type FakeSocket = Socket & { drop: (reason?: string) => void; join: ReturnType<typeof vi.fn> }

/** Just enough of a socket: an id, listeners that can be fired with a reason, and a room to join */
const fakeSocket = (id: string): FakeSocket => {
    const handlers: Record<string, (reason: string) => void> = {}
    return {
        id,
        join: vi.fn(),
        on: (event: string, handler: (reason: string) => void) => {
            handlers[event] = handler
        },
        drop: (reason = 'transport close') => handlers.disconnect?.(reason),
    } as unknown as FakeSocket
}

const messages = (emitter: SocketEmitter): string[] =>
    (emitter.emitMessage as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as string)

const privateMessages = (emitter: SocketEmitter): { content: string; to: string }[] =>
    (emitter.emitMessageToSpecificPlayer as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => ({
        content: call[0] as string,
        to: call[1] as string,
    }))

/** Three humans, so one forfeit does not end the game and staggered drops can be told apart */
const threeHumanGame = () => {
    const emitter = fakeEmitter()
    const game = new Game('g1', emitter)
    const abandoned = vi.fn()
    game.setAbandonedListener(abandoned)
    const seats = ['alice', 'bob', 'carol'].map((name, index) => {
        const socket = fakeSocket(`sock-${name}`)
        const player = new HumanPlayer(socket, ['0xFF0000', '0x00FF00', '0x0000FF'][index], name, `token-${name}`)
        game.addPlayer(player, socket.id)
        game.watchDisconnect(player)
        return { socket, player }
    })
    game.start()
    vi.advanceTimersByTime(200) // one tick, so the starting armies are counted before anything happens
    return { emitter, game, abandoned, seats }
}

describe('a dropped player keeps their seat for the grace period', () => {
    let emitter: SocketEmitter
    let game: Game
    let abandoned: ReturnType<typeof vi.fn>
    let alice: HumanPlayer
    let bob: HumanPlayer
    let carol: HumanPlayer
    let socketA: FakeSocket
    let socketB: FakeSocket
    let socketC: FakeSocket

    beforeEach(() => {
        vi.useFakeTimers()
        const built = threeHumanGame()
        emitter = built.emitter
        game = built.game
        abandoned = built.abandoned
        ;[socketA, socketB, socketC] = built.seats.map((seat) => seat.socket)
        ;[alice, bob, carol] = built.seats.map((seat) => seat.player)
    })

    it('does not end the game or forfeit anything while the grace runs', () => {
        socketA.drop()

        expect(alice.isConnected).toBe(false)
        expect(alice.isOut).toBe(false)
        expect(messages(emitter)).toContain('ℹ️️ Player disconnected: alice')
        expect(game.update()).toBe(false)

        vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1000)
        expect(alice.isOut).toBe(false)
        expect(game.update()).toBe(false)
    })

    it('hands the seat back to a new socket and cancels the clock', () => {
        socketA.drop()
        const fresh = fakeSocket('sock-alice-2')

        game.reattach(alice, fresh)

        expect(alice.isConnected).toBe(true)
        expect(game.hasSocket('sock-alice-2')).toBe(true)
        expect(game.hasSocket('sock-alice')).toBe(false)
        expect(alice.getSocketId()).toBe('sock-alice-2')
        expect(fresh.join).toHaveBeenCalledWith('g1')
        expect(emitter.emitInitialGameStateTo).toHaveBeenCalledWith('sock-alice-2', game)
        expect(messages(emitter)).toContain('alice is back')

        vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2)
        expect(alice.isOut).toBe(false)
        expect(abandoned).not.toHaveBeenCalled()
    })

    it('takes the seat back even before the server noticed the old socket dropping', () => {
        // The client reconnects in seconds; the server can take far longer to see the old socket die
        const fresh = fakeSocket('sock-alice-2')
        game.reattach(alice, fresh)
        expect(messages(emitter)).not.toContain('alice is back') // nobody saw them leave

        socketA.drop() // the stale socket finally gives up

        expect(alice.isConnected).toBe(true)
        expect(messages(emitter)).not.toContain('ℹ️️ Player disconnected: alice')
        vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2)
        expect(alice.isOut).toBe(false)
    })

    it('forfeits the seat once the grace runs out, but still lets them back in to watch', () => {
        socketA.drop()
        vi.advanceTimersByTime(RECONNECT_GRACE_MS)

        expect(alice.isOut).toBe(true)
        expect(alice.hasSurrendered).toBe(true)
        expect(messages(emitter)).toContain('alice gave up: connection lost')
        expect(abandoned).not.toHaveBeenCalled()

        // Out of the running, but the surrender dialog promises they can keep watching and chatting
        const fresh = fakeSocket('sock-alice-2')
        game.reattach(alice, fresh)
        expect(game.hasSocket('sock-alice-2')).toBe(true)
        expect(fresh.join).toHaveBeenCalledWith('g1')
        expect(emitter.emitInitialGameStateTo).toHaveBeenCalledWith('sock-alice-2', game)
        expect(messages(emitter)).not.toContain('alice is back')
    })

    it('keeps the room open while another human is still inside their own grace', () => {
        socketA.drop()
        vi.advanceTimersByTime(30_000)
        socketB.drop()
        socketC.drop()
        vi.advanceTimersByTime(30_000) // alice's clock runs out, bob and carol have 30s left

        expect(alice.isOut).toBe(true)
        expect(bob.isOut).toBe(false)
        expect(abandoned).not.toHaveBeenCalled()

        vi.advanceTimersByTime(10_000)
        game.reattach(bob, fakeSocket('sock-bob-2'))
        expect(bob.isConnected).toBe(true)
        expect(messages(emitter)).toContain('bob is back')
    })

    it('drops the room once, and only once nobody is owed a seat any more', () => {
        socketA.drop()
        vi.advanceTimersByTime(30_000)
        socketB.drop()
        vi.advanceTimersByTime(15_000)
        socketC.drop()
        vi.advanceTimersByTime(15_000) // t=60: alice forfeits, the other two still in grace
        expect(abandoned).not.toHaveBeenCalled()

        vi.advanceTimersByTime(30_000) // t=90: bob forfeits -> one seat left
        expect(bob.isOut).toBe(true)
        vi.advanceTimersByTime(200) // the next tick calls the game
        expect(game.getEndAnnouncement()?.result).toBe('This game has been won by carol')

        // A finished game waits one more grace for late-comers, then goes
        vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1000)
        expect(abandoned).not.toHaveBeenCalled()
        vi.advanceTimersByTime(2000)
        expect(abandoned).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(RECONNECT_GRACE_MS * 3)
        expect(abandoned).toHaveBeenCalledTimes(1)
    })

    it('tells a winner who was away that they won, when they come back', () => {
        socketA.drop()
        game.surrender('sock-bob')
        game.surrender('sock-carol')
        vi.advanceTimersByTime(200) // one tick: the game is called for alice

        expect(game.getEndAnnouncement()).toEqual({ result: 'This game has been won by alice', winner: alice })
        expect(messages(emitter)).toContain('This game has been won by alice')

        const fresh = fakeSocket('sock-alice-2')
        game.reattach(alice, fresh)

        expect(emitter.emitInitialGameStateTo).toHaveBeenCalledWith('sock-alice-2', game)
        expect(privateMessages(emitter)).toContainEqual({
            content: 'This game has been won by alice',
            to: 'sock-alice-2',
        })
        expect(alice.isOut).toBe(false)
        vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2)
        expect(alice.isOut).toBe(false) // a finished game forfeits nobody
    })

    it('gives the seat up on the spot when the client closes the connection on purpose', () => {
        socketA.drop('client namespace disconnect')

        expect(alice.isOut).toBe(true)
        expect(messages(emitter)).toContain('alice left the game')
        expect(messages(emitter)).not.toContain('ℹ️️ Player disconnected: alice')
    })

    it('does not stack listeners when the same socket asks for its seat twice', () => {
        game.reattach(alice, socketA)
        game.reattach(alice, socketA)
        socketA.drop()

        expect(messages(emitter).filter((line) => line === 'ℹ️️ Player disconnected: alice')).toHaveLength(1)
    })
})

describe('the full board is what a returning player is sent', () => {
    it('carries every stack, not only the ones that moved last tick', () => {
        vi.useFakeTimers()
        const { game } = threeHumanGame()
        const atStart = game.getFullState().u.updated.length
        expect(atStart).toBeGreaterThan(0)

        vi.advanceTimersByTime(3000) // ticks with nothing moving
        game.getState()
        game.getState()

        expect(game.getState().u.updated).toEqual([])
        expect(game.getFullState().u.updated).toHaveLength(atStart)
    })
})

describe('finding a seat across games', () => {
    it('answers a rejoin with the seat in the game named, spectators and finished games included', () => {
        vi.useFakeTimers()
        const first = threeHumanGame()
        const second = threeHumanGame()
        const games = { g1: first.game, g2: second.game }
        // the same tab held a seat in both: a new game started within the old one's grace
        const alice1 = first.seats[0].player
        const alice2 = second.seats[0].player

        expect(findSeat(games, 'g2', 'token-alice')?.player).toBe(alice2)
        expect(findSeat(games, 'g1', 'token-alice')?.player).toBe(alice1)
        expect(findSeat(games, 'g9', 'token-alice')).toBeNull()

        first.game.surrender('sock-alice')
        expect(findSeat(games, 'g1', 'token-alice')?.player).toBe(alice1) // out, but still a seat to watch from
    })

    it('answers a lobby join with a live seat only, whichever game holds it', () => {
        vi.useFakeTimers()
        const first = threeHumanGame()
        const games = { g1: first.game }

        expect(findLiveSeat(games, 'token-alice')?.player).toBe(first.seats[0].player)
        expect(findLiveSeat(games, 'token-nobody')).toBeNull()
        expect(findLiveSeat(games, null)).toBeNull()

        first.game.surrender('sock-alice')
        expect(findLiveSeat(games, 'token-alice')).toBeNull()
        expect(findSeat(games, undefined, 'token-alice')).toBeNull()
    })
})
