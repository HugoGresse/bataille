'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var newId_1 = require('./utils/newId')
var Game_1 = require('./Game')
var HumanPlayer_1 = require('./model/player/HumanPlayer')
var SOCKET_EMIT_1 = require('../common/SOCKET_EMIT')
var pickUnusedColor_1 = require('./utils/pickUnusedColor')
var io_1 = require('./utils/io')
var serverEnv_1 = require('./utils/serverEnv')
var GameLobby_1 = require('./GameLobby')
var SocketEmitter_1 = require('./SocketEmitter')
var trackings_1 = require('./utils/trackings')
var GameSettings_1 = require('../common/GameSettings')
var IAPlayer_1 = require('./model/player/IAPlayer')
var games = {}
var lobby
io_1.socketIOServer.on('connection', function (socket) {
    socket.on(SOCKET_EMIT_1.PLAYER_JOIN_LOBBY, handlePlayerJoin(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_FORCE_START, handlePlayerForceStart(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_UNIT, handlePlayerUnit(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_MESSAGE_POST, handlePlayerPostMessage(socket))
})
io_1.socketIOServer.listen(serverEnv_1.PORT)
console.log('Server listening on port ' + serverEnv_1.PORT)
var handlePlayerJoin = function (socket) {
    return function (playerName) {
        if (!lobby) {
            var futureGameId_1 = newId_1.newId()
            var socketEmitter_1 = new SocketEmitter_1.SocketEmitter(io_1.socketIOServer.to(futureGameId_1))
            lobby = new GameLobby_1.GameLobby(socketEmitter_1, futureGameId_1, function (waitingPlayers, sockets) {
                console.log('> Lobby ready, starting game with ' + waitingPlayers.length + ' players.')
                if (lobby) {
                    lobby.close()
                    lobby = null
                }
                startGame(futureGameId_1, socketEmitter_1, waitingPlayers, sockets)
            })
            console.log('Number of games: ' + Object.keys(games).length)
        }
        lobby.onPlayerJoin(socket, playerName)
    }
}
var handlePlayerForceStart = function (socket) {
    return function (shouldForceStart) {
        if (lobby) {
            lobby.handlePlayerForceStart(socket.id, shouldForceStart)
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
var handlePlayerUnit = function (socket) {
    return function (gameId, event) {
        var game = games[gameId]
        if (!game) {
            return
        }
        game.unitEvent(socket.id, event)
    }
}
var handlePlayerPostMessage = function (socket) {
    return function (gameId, message) {
        console.log('message', gameId, message)
        var game = games[gameId]
        if (!game) {
            return
        }
        game.playerMessage(socket.id, message)
    }
}
var startGame = function (futureGameId, socketEmitter, waitingPlayers, sockets) {
    var game = new Game_1.Game(futureGameId, socketEmitter)
    games[game.id] = game
    for (var _i = 0, waitingPlayers_1 = waitingPlayers; _i < waitingPlayers_1.length; _i++) {
        var waitingPlayer = waitingPlayers_1[_i]
        var player = new HumanPlayer_1.HumanPlayer(
            sockets[waitingPlayer.socketId],
            pickUnusedColor_1.pickUnusedColor(game.getPlayers()),
            waitingPlayer.name
        )
        player.listenForDisconnect(socketEmitter, function () {
            var connectedPlayers = game.getConnectedHumanPlayers().length
            if (!connectedPlayers) {
                console.log('> Game end (all player disconnected)')
                delete games[futureGameId]
                trackings_1.trackGameEnd(game.getGameDuration())
            }
        })
        game.addPlayer(player, waitingPlayer.socketId)
    }
    var numberOfIA = Math.min(
        GameSettings_1.IA_PLAYER_PER_GAME - waitingPlayers.length,
        GameSettings_1.IA_PLAYER_PER_GAME
    )
    for (var i = 1; i <= numberOfIA; i++) {
        var color = pickUnusedColor_1.pickUnusedColor(game.getPlayers())
        var player = new IAPlayer_1.IAPlayer(color, 'IA-' + 1)
        game.addPlayer(player, player.id)
    }
    game.start()
    trackings_1.trackGameStart(game.getPlayers().length)
}
