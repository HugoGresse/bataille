import { vi } from 'vitest'
import { Game } from '../../src/server/Game'
import { HumanPlayer } from '../../src/server/model/player/HumanPlayer'
import { SocketEmitter } from '../../src/server/SocketEmitter'
import { Socket } from 'socket.io'

export const fakeEmitter = () =>
    ({
        emitMessage: vi.fn(),
        emitMessageToSpecificPlayer: vi.fn(),
        emitLobbyState: vi.fn(),
        emitInitialGameState: vi.fn(),
        emitInitialGameStateTo: vi.fn(),
        emitGameUpdate: vi.fn(),
    }) as never as SocketEmitter

export type FakeSocket = Socket & { drop: (reason?: string) => void; join: ReturnType<typeof vi.fn> }

/** Just enough of a socket: an id, listeners that can be fired with a reason, and a room to join */
export const fakeSocket = (id: string): FakeSocket => {
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

export const messages = (emitter: SocketEmitter): string[] =>
    (emitter.emitMessage as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as string)

export const privateMessages = (emitter: SocketEmitter): { content: string; to: string }[] =>
    (emitter.emitMessageToSpecificPlayer as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => ({
        content: call[0] as string,
        to: call[1] as string,
    }))

/**
 * Three humans on the loop under fake timers, one tick in: enough that one forfeit does not end the
 * game, and that staggered drops can be told apart. Callers own `vi.useFakeTimers()`.
 */
export const threeHumanGame = () => {
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
