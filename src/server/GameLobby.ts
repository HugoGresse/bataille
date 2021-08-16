import { MINIMUM_PLAYER_PER_GAME } from '../common/GameSettings'
import { SocketEmitter } from './SocketEmitter'
import { Socket } from 'socket.io'

export class GameLobby {
    waitingPlayers: PlayerWaiting[] = []
    sockets: {
        [socketId: string]: Socket
    } = {}
    forceStartCount = 0

    constructor(
        private readonly socketEmitter: SocketEmitter,
        private futureGameId: string,
        private onLobbyReady: (socketIds: PlayerWaiting[], sockets: { [p: string]: Socket }) => void,
        private requiredPlayerToStart: number = MINIMUM_PLAYER_PER_GAME
    ) {}

    onPlayerJoin(socket: Socket, name: string) {
        const socketId = socket.id
        this.sockets[socketId] = socket
        socket.join(this.futureGameId)

        this.waitingPlayers.push({
            socketId,
            name,
        })
        console.log(`Player join lobby, ${this.waitingPlayers.length}/${this.requiredPlayerToStart}`)

        socket.on('disconnect', () => {
            delete this.sockets[socketId]
            this.waitingPlayers = this.waitingPlayers.filter((p) => p.socketId !== socketId)
            this.socketEmitter.emitLobbyState(this)
            console.log(`Player left lobby, ${this.waitingPlayers.length}/${this.requiredPlayerToStart}`)
        })

        if (this.waitingPlayers.length === this.requiredPlayerToStart) {
            this.onLobbyReady(this.waitingPlayers, this.sockets)
        } else {
            this.socketEmitter.emitLobbyState(this)
        }
    }

    //Close listeners for disconnecting
    close() {
        this.waitingPlayers.forEach((p) => {
            this.sockets[p.socketId].removeAllListeners('disconnect')
        })
    }

    export(): LobbyState {
        return {
            playerCount: this.waitingPlayers.length,
            requiredPlayerCount: this.requiredPlayerToStart,
            playerCountForceStart: this.forceStartCount,
        }
    }

    handlePlayerForceStart(shouldForceStart: boolean) {
        if (shouldForceStart) {
            this.forceStartCount++
        } else this.forceStartCount--
        this.socketEmitter.emitLobbyState(this)
        if (this.forceStartCount === this.waitingPlayers.length && this.forceStartCount > 1) {
            this.onLobbyReady(this.waitingPlayers, this.sockets)
        }
    }
}

export type PlayerWaiting = {
    socketId: string
    name: string
}

export type LobbyState = {
    playerCount: number
    requiredPlayerCount: number
    playerCountForceStart: number
}
