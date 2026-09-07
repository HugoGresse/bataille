import { Socket } from 'socket.io'
import { AbstractPlayer } from './model/player/AbstractPlayer'
import { PrivatePlayerState, PrivatePlayerStateUpdate } from './model/GameState'

/**
 * Sockets watching a game without holding a seat. They sit in the game room and are sent the board
 * like any player, but their "current player" owns nothing, so the client renders it read-only.
 */
export class Spectators {
    private socketIds = new Set<string>()

    /** Join keeps only the id; the socket drops itself out of the set when it disconnects */
    add(socket: Socket) {
        this.socketIds.add(socket.id)
        socket.on('disconnect', () => this.socketIds.delete(socket.id))
    }

    has(socketId: string): boolean {
        return this.socketIds.has(socketId)
    }
}

/**
 * The "current player" a spectator is handed: no colour matches any unit and no name matches any
 * town, so nothing is selectable or musterable, and the surrender flag marks the HUD as a watcher.
 */
export const spectatorPrivateState = (): PrivatePlayerState => ({
    n: 'Spectator',
    i: 0,
    c: '',
    ctr: [],
    tw: 0,
    cnt: true,
    d: false,
    s: true,
    m: 0,
})

export const spectatorPrivateStateUpdate = (): PrivatePlayerStateUpdate => ({ m: 0 })

/** The current-player state a socket is sent: its own if it holds a seat, a spectator's otherwise */
export const viewerPrivateState = (player?: AbstractPlayer): PrivatePlayerState =>
    player ? player.getPrivatePlayerState() : spectatorPrivateState()

export const viewerPrivateStateUpdate = (player?: AbstractPlayer): PrivatePlayerStateUpdate =>
    player ? player.getPrivatePlayerStateUpdate() : spectatorPrivateStateUpdate()
