'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const newId_1 = require('./utils/newId')
const Game_1 = require('./Game')
const HumanPlayer_1 = require('./model/player/HumanPlayer')
const SOCKET_EMIT_1 = require('../common/SOCKET_EMIT')
const pickUnusedColor_1 = require('./utils/pickUnusedColor')
const io_1 = require('./utils/io')
const serverEnv_1 = require('./utils/serverEnv')
const GameLobby_1 = require('./GameLobby')
const SocketEmitter_1 = require('./SocketEmitter')
const trackings_1 = require('./utils/trackings')
const GameSettings_1 = require('../common/GameSettings')
const IAPlayer_1 = require('./model/player/IAPlayer')
const AdminServer_1 = require('./admin/AdminServer')
const games = {}
let lobby
new AdminServer_1.AdminServer(games)
io_1.socketIOServer.on('connection', (socket) => {
    socket.on(SOCKET_EMIT_1.PLAYER_JOIN_LOBBY, handlePlayerJoin(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_FORCE_START, handlePlayerForceStart(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_LOBBY_WAIT_FOR_HUMAN, handlePlayerWaitForHuman())
    socket.on(SOCKET_EMIT_1.PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_UNIT, handlePlayerUnit(socket))
    socket.on(SOCKET_EMIT_1.PLAYER_MESSAGE_POST, handlePlayerPostMessage(socket))
})
const handlePlayerJoin = (socket) => (playerName) => {
    if (!lobby) {
        const futureGameId = newId_1.newId()
        const socketEmitter = new SocketEmitter_1.SocketEmitter(io_1.socketIOServer.to(futureGameId))
        lobby = new GameLobby_1.GameLobby(socketEmitter, futureGameId, (waitingPlayers, sockets) => {
            console.log(`> Lobby ready, starting game with ${waitingPlayers.length} players.`)
            if (lobby) {
                lobby.close()
                lobby = null
            }
            startGame(futureGameId, socketEmitter, waitingPlayers, sockets)
        })
        console.log(`Number of games: ${Object.keys(games).length}`)
    }
    lobby.onPlayerJoin(socket, playerName, Object.keys(games).length)
}
const handlePlayerForceStart = (socket) => (shouldForceStart) => {
    if (lobby) {
        lobby.handlePlayerForceStart(socket.id, shouldForceStart)
    }
}
const handlePlayerWaitForHuman = () => () => {
    if (lobby) {
        lobby.handlePlayerWaitForHuman()
    }
}
const handlePlayerNewUnit = (socket) => (gameId, data) => {
    const game = games[gameId]
    if (!game) {
        return
    }
    game.addUnit(socket.id, data)
}
const handlePlayerUnit = (socket) => (gameId, event) => {
    const game = games[gameId]
    if (!game) {
        return
    }
    game.unitEvent(socket.id, event)
}
const handlePlayerPostMessage = (socket) => (gameId, message) => {
    console.log('message', gameId, message)
    const game = games[gameId]
    if (!game) {
        return
    }
    game.playerMessage(socket.id, message)
}
const startGame = (futureGameId, socketEmitter, waitingPlayers, sockets) => {
    const game = new Game_1.Game(futureGameId, socketEmitter)
    games[game.id] = game
    for (const waitingPlayer of waitingPlayers) {
        const player = new HumanPlayer_1.HumanPlayer(
            sockets[waitingPlayer.socketId],
            pickUnusedColor_1.pickUnusedColor(game.getPlayers()),
            waitingPlayer.name
        )
        player.listenForDisconnect(socketEmitter, () => {
            const connectedPlayers = game.getConnectedHumanPlayers().length
            if (!connectedPlayers) {
                console.log(`> Game end (all player disconnected)`)
                delete games[futureGameId]
            }
        })
        game.addPlayer(player, waitingPlayer.socketId)
    }
    const numberOfIA = Math.min(
        GameSettings_1.IA_PLAYER_PER_GAME - waitingPlayers.length,
        GameSettings_1.IA_PLAYER_PER_GAME
    )
    for (let i = 1; i <= numberOfIA; i++) {
        const color = pickUnusedColor_1.pickUnusedColor(game.getPlayers())
        const player = new IAPlayer_1.IAPlayer(color, `AI-${i}`)
        game.addPlayer(player, player.id)
    }
    game.start()
    trackings_1.trackGameStart(game.getConnectedHumanPlayers().length)
}
console.log(`Server started on port ${serverEnv_1.PORT}`)
