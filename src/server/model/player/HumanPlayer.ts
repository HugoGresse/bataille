import { Socket } from 'socket.io'
import { SocketEmitter } from '../../SocketEmitter'
import { AbstractPlayer } from './AbstractPlayer'

export class HumanPlayer extends AbstractPlayer {
    constructor(protected socket: Socket, color: string, name?: string) {
        super(name, color)
    }

    public listenForDisconnect(socketEmitter: SocketEmitter, onPlayerDisconnect: () => void) {
        this.socket.on('disconnect', () => {
            socketEmitter.emitMessage(`ℹ️️ Player disconnected: ${this.name}`, this)
            this.setConnected(false)
            onPlayerDisconnect()
        })
    }
}
