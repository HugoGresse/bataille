'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var newId_1 = require('./utils/newId')
var Game_1 = require('./Game')
var Player_1 = require('./model/Player')
var SOCKET_EMIT_1 = require('../common/SOCKET_EMIT')
var pickUnusedColor_1 = require('./utils/pickUnusedColor')
var io_1 = require('./utils/io')
var serverEnv_1 = require('./utils/serverEnv')
var GameLobby_1 = require('./GameLobby')
var SocketEmitter_1 = require('./SocketEmitter')
var games = {}
var lobby
io_1.socketIOServer.on('connection', function (socket) {
    socket.on(SOCKET_EMIT_1.PLAYER_JOIN_LOBBY, handlePlayerJoin(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_FORCE_START, handlePlayerForceStart())
    socket.on(SOCKET_EMIT_1.PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_UNIT, handlePlayerUnit(socket))
    socket.on(SOCKET_EMIT_1.GAME_CLEAR, handleClearGame())
})
io_1.socketIOServer.listen(serverEnv_1.PORT)
console.log('Server listening on port ' + serverEnv_1.PORT)
var handlePlayerJoin = function (socket) {
    return function (playerName) {
        if (!lobby) {
            var futureGameId_1 = newId_1.newId()
            var socketEmitter_1 = new SocketEmitter_1.SocketEmitter(io_1.socketIOServer.to(futureGameId_1))
            lobby = new GameLobby_1.GameLobby(socketEmitter_1, futureGameId_1, function (waitingPlayers) {
                console.log('> Lobby ready, starting game with ' + waitingPlayers.length + ' players.')
                var game = new Game_1.Game(futureGameId_1, socketEmitter_1)
                games[game.id] = game
                for (var _i = 0, waitingPlayers_1 = waitingPlayers; _i < waitingPlayers_1.length; _i++) {
                    var waitingPlayer = waitingPlayers_1[_i]
                    var player = new Player_1.Player(
                        waitingPlayer.socketId,
                        pickUnusedColor_1.pickUnusedColor(game.getPlayers()),
                        waitingPlayer.name
                    )
                    game.addPlayer(player, waitingPlayer.socketId)
                }
                game.start()
                if (lobby) {
                    lobby.close()
                    lobby = null
                }
            })
            console.log('Number of games: ' + Object.keys(games).length)
        }
        lobby.onPlayerJoin(socket, playerName)
    }
}
var handlePlayerForceStart = function () {
    return function (shouldForceStart) {
        if (lobby) {
            lobby.handlePlayerForceStart(shouldForceStart)
        }
    }
}
var handlePlayerNewUnit = function (socket) {
    return function (gameId, data) {
        var game = games[gameId]
        if (!game) {
            return
        }
        game.addUnit(socket.id, data)
    }
}
var handleClearGame = function () {
    return function (gameId) {
        var game = games[gameId]
        if (!game) {
            return
        }
        game.stopLoop()
        console.log('clearGame')
    }
}
var handlePlayerUnit = function (socket) {
    return function (gameId, event) {
        var game = games[gameId]
        if (!game) {
            return
        }
        game.unitEvent(socket.id, event)
    }
}
