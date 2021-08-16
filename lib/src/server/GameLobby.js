'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GameLobby = void 0
var GameSettings_1 = require('../common/GameSettings')
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
        this.forceStartCount = 0
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
            _this.socketEmitter.emitLobbyState(_this)
            console.log('Player left lobby, ' + _this.waitingPlayers.length + '/' + _this.requiredPlayerToStart)
        })
        if (this.waitingPlayers.length === this.requiredPlayerToStart) {
            this.onLobbyReady(this.waitingPlayers)
        } else {
            this.socketEmitter.emitLobbyState(this)
        }
    }
    //Close listeners for disconnecting
    GameLobby.prototype.close = function () {
        var _this = this
        this.waitingPlayers.forEach(function (p) {
            _this.sockets[p.socketId].removeAllListeners('disconnect')
        })
    }
    GameLobby.prototype.export = function () {
        return {
            playerCount: this.waitingPlayers.length,
            requiredPlayerCount: this.requiredPlayerToStart,
            playerCountForceStart: this.forceStartCount,
        }
    }
    GameLobby.prototype.handlePlayerForceStart = function (shouldForceStart) {
        if (shouldForceStart) {
            this.forceStartCount++
        } else this.forceStartCount--
        this.socketEmitter.emitLobbyState(this)
        if (this.forceStartCount === this.waitingPlayers.length && this.forceStartCount > 1) {
            this.onLobbyReady(this.waitingPlayers)
        }
    }
    return GameLobby
})()
exports.GameLobby = GameLobby
