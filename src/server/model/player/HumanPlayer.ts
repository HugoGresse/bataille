import { Socket } from 'socket.io'
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

    /** @param onPlayerDisconnect receives socket.io's reason: an explicit leave reads differently from a drop */
    public listenForDisconnect(onPlayerDisconnect: (reason: string) => void) {
        const socket = this.socket
        socket.on('disconnect', (reason: string) => {
            // A network drop is often noticed by the server long after the client has already come
            // back on a new socket: the old one falling silent then is not news
            if (this.socket !== socket) {
                return
            }
            this.setConnected(false)
            onPlayerDisconnect(reason)
        })
    }

    public getSocketId(): string {
        return this.socket.id
    }
}
