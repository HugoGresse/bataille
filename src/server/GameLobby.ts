import {MINIMUM_PLAYER_PER_GAME} from '../common/GameSettings'
import {SocketEmitter} from './SocketEmitter'
import {Socket} from 'socket.io'

export class GameLobby {

    waitingPlayers: PlayerWaiting[] = []
    sockets: {
        [socketId: string]: Socket
    } = {}

    constructor(private readonly socketEmitter: SocketEmitter, private futureGameId: string, private onLobbyReady: (socketIds: PlayerWaiting[]) => void, private requiredPlayerToStart: number = MINIMUM_PLAYER_PER_GAME) {
    }

    onPlayerJoin(socket: Socket, name: string) {
        console.log(`Player join lobby, ${this.waitingPlayers.length}/${this.requiredPlayerToStart}`)

        const socketId = socket.id
        socket.join(this.futureGameId)

        this.waitingPlayers.push({
            socketId, name
        })

        socket.on("disconnect", () => {
            console.log(`Player left lobby, ${this.waitingPlayers.length}/${this.requiredPlayerToStart}`)
            this.waitingPlayers = this.waitingPlayers.filter(p => p.socketId !== socketId)
        })

        if(socketId.length === this.requiredPlayerToStart) {
            this.onLobbyReady(this.waitingPlayers)
        }  else {
            this.socketEmitter.emitLobbyState(this)
        }
    }

    //Close listeners for disconnecting
    close() {
        this.waitingPlayers.forEach(p => {
            this.sockets[p.socketId].removeAllListeners("disconnect")
        })
    }

    export(): LobbyState {
        return {
            playerCount: this.waitingPlayers.length,
            requiredPlayerCount: this.requiredPlayerToStart,
            playerCountForceStart: 0
        }
    }
}

export type PlayerWaiting = {
    socketId: string,
    name: string
}

export type LobbyState = {
    playerCount: number,
    requiredPlayerCount: number,
    playerCountForceStart: number
}
