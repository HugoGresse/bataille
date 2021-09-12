'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameLobby = void 0
const GameSettings_1 = require('../common/GameSettings')
const GAME_START_COUNTDOWN_SECONDS = 30
class GameLobby {
    constructor(
        socketEmitter,
        futureGameId,
        onLobbyReady,
        requiredPlayerToStart = GameSettings_1.MINIMUM_PLAYER_PER_GAME
    ) {
        this.socketEmitter = socketEmitter
        this.futureGameId = futureGameId
        this.onLobbyReady = onLobbyReady
        this.requiredPlayerToStart = requiredPlayerToStart
        this.waitingPlayers = []
        this.sockets = {}
        this.forceStartSocketIds = []
        this.gameStartCountdown = 0
        this.gameStartCountdownInterval = null
        this.ongoingGame = 0
    }
    onPlayerJoin(socket, name, ongoingGames) {
        const socketId = socket.id
        this.ongoingGame = ongoingGames
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
        if (this.gameStartCountdownInterval) {
            return
        }
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
    export() {
        return {
            playerCount: this.waitingPlayers.length,
            requiredPlayerCount: this.requiredPlayerToStart,
            playerCountForceStart: this.forceStartSocketIds.length,
            countdown: GAME_START_COUNTDOWN_SECONDS - this.gameStartCountdown,
            ongoingGame: this.ongoingGame,
        }
    }
    handlePlayerForceStart(socketId, shouldForceStart) {
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
exports.GameLobby = GameLobby
