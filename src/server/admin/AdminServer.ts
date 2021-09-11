import { Game } from '../Game'
import { Socket } from 'socket.io'
import { ADMIN_ACTION, ADMIN_NAMESPACE, ADMIN_UPDATE, AdminActionsTypes, GAME_MESSAGE } from '../../common/SOCKET_EMIT'
import { ADMIN_KEY } from '../utils/serverEnv'
import { socketIOServer } from '../utils/io'
import { formatGames } from './formatGames'
import { AdminActions } from './types/AdminActions'

export class AdminServer {
    private connectedSocket: Socket | null = null
    private updateInterval: null | NodeJS.Timeout = null

    constructor(private games: { [id: string]: Game }) {
        socketIOServer
            .of(`/${ADMIN_NAMESPACE}`)
            .on('connection', (socket) => {
                if (socket.handshake.auth?.token !== ADMIN_KEY) {
                    console.log('<< Not allowed admin access')
                    socket.disconnect(true)
                    return
                }

                this.connectedSocket = socket

                console.log('<< connected to admin', socket.id)

                if (!this.updateInterval) {
                    this.updateInterval = setInterval(() => this.update(), 2000)
                }

                socket.on(ADMIN_ACTION, this.handleAction(socket))
            })
            .on('disconnect', () => {
                console.log('<< disconnected from admin')
                if (this.updateInterval) {
                    clearInterval(this.updateInterval)
                    this.updateInterval = null
                }
                this.connectedSocket = null
            })
    }

    private update() {
        if (!this.connectedSocket) {
            return
        }
        socketIOServer.of(ADMIN_NAMESPACE).to(this.connectedSocket.id).emit(ADMIN_UPDATE, formatGames(this.games))
    }

    private handleAction(socket: Socket) {
        return ({ type, payload }: AdminActions, token: string) => {
            if (token !== ADMIN_KEY) {
                console.log('<< Not allowed admin access')
                socket.disconnect(true)
                return
            }

            switch (type) {
                case AdminActionsTypes.sendMessage:
                    console.log(`Send message to all games:`, payload)
                    socketIOServer.emit(GAME_MESSAGE, {
                        content: payload.message,
                    })
                    break
                default:
                    console.log('Not managed action', type)
                    break
            }
        }
    }
}
