import {GAME_CLEAR, PLAYER_JOINED, PLAYER_NEW_UNIT} from '../../constants/SOCKET_EMIT'
import {Socket} from 'socket.io-client'

export class GameActions {

    constructor(protected socket: Socket) {
    }


    joinGame() {
        this.socket.emit(PLAYER_JOINED, "Hugo")
    }

    newUnit() {
        this.socket.emit(PLAYER_NEW_UNIT)
    }

    clearGame() {
        this.socket.emit(GAME_CLEAR)
    }
}
