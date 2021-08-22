import { PLAYER_MESSAGE_POST, PLAYER_NEW_UNIT, PLAYER_UNIT } from '../../common/SOCKET_EMIT'
import { Socket } from 'socket.io-client'
import { Actor } from './actors/Actor'
import { UnitActionType } from '../../common/UnitAction'

export class GameActions {
    gameId: string | null = null

    constructor(protected socket: Socket) {}

    setGameId(gameId: string) {
        this.gameId = gameId
    }

    newUnit(x: number, y: number) {
        this.socket.emit(PLAYER_NEW_UNIT, this.gameId, {
            x,
            y,
        })
    }

    moveUnit(actor: Actor, tx: number, ty: number) {
        this.socket.emit(PLAYER_UNIT, this.gameId, {
            unitId: actor.id,
            type: UnitActionType.Move,
            data: {
                destination: {
                    x: tx,
                    y: ty,
                },
            },
        })
    }

    sendMessage(message: string) {
        this.socket.emit(PLAYER_MESSAGE_POST, this.gameId, message)
    }
}
