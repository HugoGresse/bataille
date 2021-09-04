import { MINIMUM_PLAYER_PER_GAME } from '../common/GameSettings'
import { SocketEmitter } from './SocketEmitter'
import { Socket } from 'socket.io'

const GAME_START_COUNTDOWN_SECONDS = 60

export class GameLobby {
    waitingPlayers: PlayerWaiting[] = []
    sockets: {
        [socketId: string]: Socket
    } = {}
    forceStartSocketIds: string[] = []
    gameStartCountdown: number = 0
    gameStartCountdownInterval: NodeJS.Timeout | null = null

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
            this.forceStartSocketIds = this.forceStartSocketIds.filter((id) => socketId !== id)
            this.stopCountdown()
            this.socketEmitter.emitLobbyState(this)
            console.log(`Player left lobby, ${this.waitingPlayers.length}/${this.requiredPlayerToStart}`)
        })

        if (this.waitingPlayers.length === this.requiredPlayerToStart) {
            this.lobbyReady()
        } else {
            this.socketEmitter.emitLobbyState(this)
            this.startCountdown()
        }
    }

    lobbyReady() {
        this.stopCountdown()
        this.onLobbyReady(this.waitingPlayers, this.sockets)
    }

    startCountdown() {
        this.gameStartCountdownInterval = setInterval(() => {
            this.gameStartCountdown++
            if (this.gameStartCountdown >= GAME_START_COUNTDOWN_SECONDS) {
                this.lobbyReady()
            } else this.socketEmitter.emitLobbyState(this)
        }, 1000)
    }

    stopCountdown() {
        if (this.gameStartCountdownInterval) {
            clearInterval(this.gameStartCountdownInterval)
            this.gameStartCountdownInterval = null
            this.gameStartCountdown = 0
            this.socketEmitter.emitLobbyState(this)
        }
    }

    //Close listeners for disconnecting
    close() {
        if (this.gameStartCountdownInterval) {
            clearInterval(this.gameStartCountdownInterval)
        }
        this.waitingPlayers.forEach((p) => {
            this.sockets[p.socketId].removeAllListeners('disconnect')
        })
    }

    export(): LobbyState {
        return {
            playerCount: this.waitingPlayers.length,
            requiredPlayerCount: this.requiredPlayerToStart,
            playerCountForceStart: this.forceStartSocketIds.length,
            countdown: GAME_START_COUNTDOWN_SECONDS - this.gameStartCountdown,
        }
    }

    handlePlayerForceStart(socketId: string, shouldForceStart: boolean) {
        if (shouldForceStart) {
            this.forceStartSocketIds.push(socketId)
        } else {
            this.forceStartSocketIds = this.forceStartSocketIds.filter((id) => id !== socketId)
        }
        this.socketEmitter.emitLobbyState(this)
        if (this.forceStartSocketIds.length === this.waitingPlayers.length && this.forceStartSocketIds.length > 1) {
            this.lobbyReady()
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
    countdown: number
}
