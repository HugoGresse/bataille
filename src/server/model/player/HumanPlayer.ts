import { Socket } from 'socket.io'
import { SocketEmitter } from '../../SocketEmitter'
import { AbstractPlayer } from './AbstractPlayer'

export class HumanPlayer extends AbstractPlayer {
    constructor(
        protected socket: Socket,
        color: string,
        name?: string,
        /** Survives the socket: what a reconnecting client hands over to get its seat back */
        public readonly sessionToken: string | null = null
    ) {
        super(name, color)
    }

    /** A fresh socket for the same person */
    public attachSocket(socket: Socket) {
        this.socket = socket
        this.setConnected(true)
    }

    public listenForDisconnect(socketEmitter: SocketEmitter, onPlayerDisconnect: () => void) {
        const socket = this.socket
        socket.on('disconnect', () => {
            // A network drop is often noticed by the server long after the client has already come
            // back on a new socket: the old one falling silent then is not news
            if (this.socket !== socket) {
                return
            }
            socketEmitter.emitMessage(`ℹ️️ Player disconnected: ${this.name}`, this)
            this.setConnected(false)
            onPlayerDisconnect()
        })
    }

    public getSocketId(): string {
        return this.socket.id
    }
}
