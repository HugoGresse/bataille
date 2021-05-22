import {GAME_CLEAR, PLAYER_JOINED, PLAYER_NEW_UNIT, PLAYER_UNIT} from '../../common/SOCKET_EMIT'
import {Socket} from 'socket.io-client'
import {Actor} from './actors/Actor'
import {UnitActionType} from '../../common/UnitAction'

export class GameActions {

    constructor(protected socket: Socket) {
    }


    joinGame() {
        this.socket.emit(PLAYER_JOINED, "Hugo")
    }

    newUnit() {
        this.socket.emit(PLAYER_NEW_UNIT)
    }

    moveUnit(actor: Actor, tx: number, ty: number) {
        this.socket.emit(PLAYER_UNIT, {
            unitId: actor.id,
            type: UnitActionType.Move,
            data: {
                destination: {
                    x: tx,
                    y: ty
                }
            }
        })
    }

    clearGame() {
        this.socket.emit(GAME_CLEAR)
    }

}
