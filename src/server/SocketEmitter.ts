import {BroadcastOperator} from 'socket.io'
import {DefaultEventsMap} from 'socket.io/dist/typed-events'
import {Game} from './Game'
import {GAME_STATE_INIT, GAME_STATE_UPDATE} from '../common/SOCKET_EMIT'
import {io} from 'socket.io-client'
import {socketIOServer} from './utils/io'

/**
 * Emit events to a specific Socket room provided at construction
 */
export class SocketEmitter {

    constructor(private sockets: BroadcastOperator<DefaultEventsMap>) {
    }

    emitInitialGameState(game: Game) {
        this.sockets.emit(GAME_STATE_INIT, game.export())
    }

    async emitGameUpdate(game: Game) {
        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => {
            socketIOServer.to(socketId).emit(GAME_STATE_UPDATE, game.getState(socketId))
        })
    }
}
