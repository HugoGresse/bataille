'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameLobby = void 0
var GameSettings_1 = require('../common/GameSettings')
var GAME_START_COUNTDOWN_SECONDS = 60
var GameLobby = /** @class */ (function () {
    function GameLobby(socketEmitter, futureGameId, onLobbyReady, requiredPlayerToStart) {
        if (requiredPlayerToStart === void 0) {
            requiredPlayerToStart = GameSettings_1.MINIMUM_PLAYER_PER_GAME
        }
        this.socketEmitter = socketEmitter
        this.futureGameId = futureGameId
        this.onLobbyReady = onLobbyReady
        this.requiredPlayerToStart = requiredPlayerToStart
        this.waitingPlayers = []
        this.sockets = {}
        this.forceStartSocketIds = []
        this.gameStartCountdown = 0
        this.gameStartCountdownInterval = null
    }
    GameLobby.prototype.onPlayerJoin = function (socket, name) {
        var _this = this
        var socketId = socket.id
        this.sockets[socketId] = socket
        socket.join(this.futureGameId)
        this.waitingPlayers.push({
            socketId: socketId,
            name: name,
        })
        console.log('Player join lobby, ' + this.waitingPlayers.length + '/' + this.requiredPlayerToStart)
        socket.on('disconnect', function () {
            delete _this.sockets[socketId]
            _this.waitingPlayers = _this.waitingPlayers.filter(function (p) {
                return p.socketId !== socketId
            })
            _this.forceStartSocketIds = _this.forceStartSocketIds.filter(function (id) {
                return socketId !== id
            })
            _this.stopCountdown()
            _this.socketEmitter.emitLobbyState(_this)
            console.log('Player left lobby, ' + _this.waitingPlayers.length + '/' + _this.requiredPlayerToStart)
        })
        if (this.waitingPlayers.length === this.requiredPlayerToStart) {
            this.lobbyReady()
        } else {
            this.socketEmitter.emitLobbyState(this)
            this.startCountdown()
        }
    }
    GameLobby.prototype.lobbyReady = function () {
        this.stopCountdown()
        this.onLobbyReady(this.waitingPlayers, this.sockets)
    }
    GameLobby.prototype.startCountdown = function () {
        var _this = this
        if (this.gameStartCountdownInterval) {
            return
        }
        this.gameStartCountdownInterval = setInterval(function () {
            _this.gameStartCountdown++
            if (_this.gameStartCountdown >= GAME_START_COUNTDOWN_SECONDS) {
                _this.lobbyReady()
            } else _this.socketEmitter.emitLobbyState(_this)
        }, 1000)
    }
    GameLobby.prototype.stopCountdown = function () {
        if (this.gameStartCountdownInterval) {
            clearInterval(this.gameStartCountdownInterval)
            this.gameStartCountdownInterval = null
            this.gameStartCountdown = 0
            this.socketEmitter.emitLobbyState(this)
        }
    }
    //Close listeners for disconnecting
    GameLobby.prototype.close = function () {
        var _this = this
        if (this.gameStartCountdownInterval) {
            clearInterval(this.gameStartCountdownInterval)
        }
        this.waitingPlayers.forEach(function (p) {
            _this.sockets[p.socketId].removeAllListeners('disconnect')
        })
    }
    GameLobby.prototype.export = function () {
        return {
            playerCount: this.waitingPlayers.length,
            requiredPlayerCount: this.requiredPlayerToStart,
            playerCountForceStart: this.forceStartSocketIds.length,
            countdown: GAME_START_COUNTDOWN_SECONDS - this.gameStartCountdown,
        }
    }
    GameLobby.prototype.handlePlayerForceStart = function (socketId, shouldForceStart) {
        if (shouldForceStart) {
            this.forceStartSocketIds.push(socketId)
        } else {
            this.forceStartSocketIds = this.forceStartSocketIds.filter(function (id) {
                return id !== socketId
            })
        }
        this.socketEmitter.emitLobbyState(this)
        if (this.forceStartSocketIds.length === this.waitingPlayers.length && this.forceStartSocketIds.length > 1) {
            this.lobbyReady()
        }
    }
    return GameLobby
})()
exports.GameLobby = GameLobby
