import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from '../src/server/Game'
import { HumanPlayer } from '../src/server/model/player/HumanPlayer'
import { SocketEmitter } from '../src/server/SocketEmitter'
import { RECONNECT_GRACE_MS } from '../src/common/GameSettings'
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

/** Just enough of a socket: an id, listeners that can be fired, and a room to join */
const fakeSocket = (id: string) => {
    const handlers: Record<string, () => void> = {}
    const socket = {
        id,
        join: vi.fn(),
        on: (event: string, handler: () => void) => {
            handlers[event] = handler
        },
        drop: () => handlers.disconnect?.(),
    }
    return socket as unknown as Socket & { drop: () => void; join: ReturnType<typeof vi.fn> }
}

const messages = (emitter: SocketEmitter): string[] =>
    (emitter.emitMessage as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as string)

describe('a dropped player keeps their seat for the grace period', () => {
    let emitter: SocketEmitter
    let game: Game
    let socketA: ReturnType<typeof fakeSocket>
    let socketB: ReturnType<typeof fakeSocket>
    let alice: HumanPlayer
    let bob: HumanPlayer
    const abandoned = vi.fn()

    beforeEach(() => {
        vi.useFakeTimers()
        abandoned.mockReset()
        emitter = fakeEmitter()
        game = new Game('g1', emitter)
        game.setAbandonedListener(abandoned)
        socketA = fakeSocket('sock-a')
        socketB = fakeSocket('sock-b')
        alice = new HumanPlayer(socketA, '0xFF0000', 'Alice', 'token-alice')
        bob = new HumanPlayer(socketB, '0x00FF00', 'Bob', 'token-bob')
        game.addPlayer(alice, socketA.id)
        game.addPlayer(bob, socketB.id)
        game.watchDisconnect(alice)
        game.watchDisconnect(bob)
        game.start()
    })

    it('does not end the game or forfeit anything while the grace runs', () => {
        socketA.drop()

        expect(alice.isConnected).toBe(false)
        expect(alice.isOut).toBe(false)
        expect(game.update()).toBe(false)

        vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1000)
        expect(alice.isOut).toBe(false)
        expect(game.update()).toBe(false)
    })

    it('hands the seat back to a new socket and cancels the clock', () => {
        socketA.drop()
        const fresh = fakeSocket('sock-a2')

        expect(game.reattach('token-alice', fresh)).toBe(true)

        expect(alice.isConnected).toBe(true)
        expect(game.hasSocket('sock-a2')).toBe(true)
        expect(game.hasSocket('sock-a')).toBe(false)
        expect(alice.getSocketId()).toBe('sock-a2')
        expect(fresh.join).toHaveBeenCalledWith('g1')
        expect(emitter.emitInitialGameStateTo).toHaveBeenCalledWith('sock-a2', game)
        expect(messages(emitter)).toContain('Alice is back')

        vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2)
        expect(alice.isOut).toBe(false)
        expect(abandoned).not.toHaveBeenCalled()
    })

    it('takes the seat back even before the server noticed the old socket dropping', () => {
        // The client reconnects in seconds; the server can take far longer to see the old socket die
        const fresh = fakeSocket('sock-a2')
        expect(game.reattach('token-alice', fresh)).toBe(true)
        expect(messages(emitter)).not.toContain('Alice is back') // nobody saw them leave

        socketA.drop() // the stale socket finally gives up

        expect(alice.isConnected).toBe(true)
        expect(messages(emitter)).not.toContain('ℹ️️ Player disconnected: Alice')
        vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2)
        expect(alice.isOut).toBe(false)
    })

    it('forfeits the seat once the grace runs out, and refuses to hand it back after', () => {
        socketA.drop()
        vi.advanceTimersByTime(RECONNECT_GRACE_MS)

        expect(alice.isOut).toBe(true)
        expect(alice.hasSurrendered).toBe(true)
        expect(messages(emitter)).toContain('Alice gave up: connection lost')
        expect(game.reattach('token-alice', fakeSocket('sock-a3'))).toBe(false)
        // Bob is still here, so the game itself is not abandoned
        expect(abandoned).not.toHaveBeenCalled()
    })

    it('ends and drops the game once everyone is gone for good', () => {
        socketA.drop()
        socketB.drop()
        expect(game.update()).toBe(false) // both still have a seat

        vi.advanceTimersByTime(RECONNECT_GRACE_MS)

        expect(game.update()).toBe(true)
        expect(abandoned).toHaveBeenCalledTimes(1)
    })

    it('refuses tokens it does not know', () => {
        expect(game.reattach('token-nobody', fakeSocket('sock-x'))).toBe(false)
        expect(game.reattach('', fakeSocket('sock-y'))).toBe(false)
    })
})
