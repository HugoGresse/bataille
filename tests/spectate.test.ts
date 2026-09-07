import { beforeEach, describe, expect, it, vi } from 'vitest'
import { threeHumanGame, fakeSocket, FakeSocket } from './helpers/gameFixture'
import { Game } from '../src/server/Game'
import { SocketEmitter } from '../src/server/SocketEmitter'
import { spectatorPrivateState, viewerPrivateState } from '../src/server/Spectators'
import { HumanPlayer } from '../src/server/model/player/HumanPlayer'

const emitInitialGameStateTo = (emitter: SocketEmitter) =>
    emitter.emitInitialGameStateTo as unknown as ReturnType<typeof vi.fn>

describe('an admin watching a game without a seat', () => {
    let game: Game
    let emitter: SocketEmitter
    let alice: HumanPlayer
    let watcher: FakeSocket

    beforeEach(() => {
        vi.useFakeTimers()
        const built = threeHumanGame()
        game = built.game
        emitter = built.emitter
        alice = built.seats[0].player
        watcher = fakeSocket('watch-1')
        game.addSpectator(watcher)
    })

    it('joins the room and is sent the board, without becoming a player', () => {
        expect(watcher.join).toHaveBeenCalledWith('g1')
        expect(game.hasViewer('watch-1')).toBe(true)
        expect(game.hasSocket('watch-1')).toBe(false) // not a seat
        expect(emitInitialGameStateTo(emitter)).toHaveBeenCalledWith('watch-1', game)
    })

    it('is handed a current player that owns nothing, so the client stays read-only', () => {
        const cp = game.getViewerPrivateState('watch-1')
        expect(cp).toMatchObject({ n: 'Spectator', c: '', s: true, m: 0 })
        expect(game.getViewerPrivateStateUpdate('watch-1')).toEqual({ m: 0 })
    })

    it('still hands a real seat holder their own state', () => {
        const cp = game.getViewerPrivateState(alice.getSocketId())
        expect(cp.n).toBe('alice')
        expect(cp).toEqual(alice.getPrivatePlayerState())
    })

    it('cannot act on the game: unit orders under a spectator socket are ignored', () => {
        const before = game.getFullState().u.updated.length
        expect(() => game.addUnit('watch-1', { x: 0, y: 0, unitCount: 1 } as never)).not.toThrow()
        expect(game.getFullState().u.updated.length).toBe(before)
    })

    it('drops out of the viewer set when it disconnects', () => {
        watcher.drop()
        expect(game.hasViewer('watch-1')).toBe(false)
    })
})

describe('viewerPrivateState', () => {
    it('is the player state when a seat is held, a spectator state when it is not', () => {
        expect(viewerPrivateState(undefined)).toEqual(spectatorPrivateState())
        const socket = fakeSocket('s')
        const player = new HumanPlayer(socket as never, '0xFF0000', 'zoe', 'tok')
        expect(viewerPrivateState(player)).toEqual(player.getPrivatePlayerState())
    })
})
