import { describe, expect, it, vi } from 'vitest'
import { GameLobby } from '../src/server/GameLobby'
import { SocketEmitter } from '../src/server/SocketEmitter'
import { Socket } from 'socket.io'

const fakeEmitter = () => ({ emitLobbyState: vi.fn() }) as never as SocketEmitter

const fakeSocket = (id: string) => {
    const handlers: Record<string, () => void> = {}
    return {
        id,
        join: vi.fn(),
        removeAllListeners: vi.fn(),
        on: (event: string, handler: () => void) => {
            handlers[event] = handler
        },
        drop: () => handlers.disconnect?.(),
    } as unknown as Socket & { drop: () => void }
}

describe('GameLobby', () => {
    it('lets the same tab back on a new socket take over its slot instead of doubling it', () => {
        vi.useFakeTimers()
        const onReady = vi.fn()
        const lobby = new GameLobby(fakeEmitter(), 'g1', onReady, 2)
        const first = fakeSocket('sock-1')
        const second = fakeSocket('sock-2')

        lobby.onPlayerJoin(first, 'Alice', 0, 'token-alice')
        lobby.handlePlayerForceStart('sock-1', true)
        lobby.onPlayerJoin(second, 'Alice', 0, 'token-alice')

        expect(lobby.waitingPlayers.map((p) => p.socketId)).toEqual(['sock-2'])
        expect(lobby.forceStartSocketIds).toEqual([])
        expect(onReady).not.toHaveBeenCalled() // one person is not two players

        // The stale socket finally dying must not take the fresh slot, nor the countdown, with it
        const countdownBefore = lobby.export().countdown
        first.drop()
        expect(lobby.waitingPlayers.map((p) => p.socketId)).toEqual(['sock-2'])
        expect(lobby.export().countdown).toBe(countdownBefore)
    })

    it('still seats two different tabs as two players', () => {
        vi.useFakeTimers()
        const onReady = vi.fn()
        const lobby = new GameLobby(fakeEmitter(), 'g1', onReady, 2)

        lobby.onPlayerJoin(fakeSocket('sock-1'), 'Alice', 0, 'token-alice')
        lobby.onPlayerJoin(fakeSocket('sock-2'), 'Bob', 0, 'token-bob')

        expect(onReady).toHaveBeenCalledTimes(1)
        expect(lobby.waitingPlayers).toHaveLength(2)
    })

    it('pings the first waiter once, not on later joins nor on a reconnect', () => {
        vi.useFakeTimers()
        const onWaiting = vi.fn()
        const lobby = new GameLobby(fakeEmitter(), 'g1', vi.fn(), 6, onWaiting)

        lobby.onPlayerJoin(fakeSocket('sock-1'), 'Alice', 2, 'token-alice')
        expect(onWaiting).toHaveBeenCalledTimes(1)
        expect(onWaiting).toHaveBeenCalledWith(
            'Alice',
            expect.objectContaining({ playerCount: 1, requiredPlayerCount: 6, ongoingGame: 2 })
        )

        lobby.onPlayerJoin(fakeSocket('sock-2'), 'Bob', 2, 'token-bob')
        expect(onWaiting).toHaveBeenCalledTimes(1) // the second player is not the first waiter

        lobby.onPlayerJoin(fakeSocket('sock-3'), 'Alice', 2, 'token-alice') // same tab reconnecting
        expect(onWaiting).toHaveBeenCalledTimes(1) // a reconnect is not a new waiter
    })

    it('treats players without a token the old way: every socket is a slot', () => {
        vi.useFakeTimers()
        const onReady = vi.fn()
        const lobby = new GameLobby(fakeEmitter(), 'g1', onReady, 3)

        lobby.onPlayerJoin(fakeSocket('sock-1'), 'Anon', 0)
        lobby.onPlayerJoin(fakeSocket('sock-2'), 'Anon', 0)

        expect(lobby.waitingPlayers).toHaveLength(2)
    })
})

describe('one account, one seat', () => {
    it('replaces the waiting seat of the same account joining from another tab', () => {
        const lobby = new GameLobby(fakeEmitter(), 'g', () => {}, 6)
        lobby.onPlayerJoin(fakeSocket('tab-1'), 'Alice', 0, 'token-tab-1', 'acc-alice')
        lobby.onPlayerJoin(fakeSocket('tab-2'), 'Alice', 0, 'token-tab-2', 'acc-alice')
        lobby.onPlayerJoin(fakeSocket('tab-3'), 'Guest', 0, 'token-tab-3', null)
        lobby.onPlayerJoin(fakeSocket('tab-4'), 'Guest', 0, 'token-tab-4', null)
        expect(lobby.waitingPlayers.map((p) => p.socketId)).toEqual(['tab-2', 'tab-3', 'tab-4'])
    })
})
