import {BroadcastOperator} from 'socket.io'
import {DefaultEventsMap} from 'socket.io/dist/typed-events'
import {Game} from './Game'
import {GAME_STATE_INIT, GAME_STATE_UPDATE} from '../common/SOCKET_EMIT'

export class SocketEmitter {

    constructor(private sockets: BroadcastOperator<DefaultEventsMap>) {
    }

    emitInitialGameState(game: Game) {
        this.sockets.emit(GAME_STATE_INIT, game.export())
    }

    emitGameUpdate(game: Game) {
        // console.log(game.getState())
        this.sockets.emit(GAME_STATE_UPDATE, game.getState())
    }
}
