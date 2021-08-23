import { Socket } from 'socket.io'
import { newId } from './utils/newId'
import { Game } from './Game'
import { Player } from './model/Player'
import {
    PLAYER_JOIN_LOBBY,
    PLAYER_NEW_UNIT,
    PLAYER_FORCE_START,
    PLAYER_UNIT,
    PLAYER_MESSAGE_POST,
} from '../common/SOCKET_EMIT'
import { UnitAction } from '../common/UnitAction'
import { pickUnusedColor } from './utils/pickUnusedColor'
import { NewUnitDataEvent } from '../common/NewUnitDataEvent'
import { socketIOServer } from './utils/io'
import { PORT } from './utils/serverEnv'
import { GameLobby } from './GameLobby'
import { SocketEmitter } from './SocketEmitter'
import { trackGameEnd, trackGameStart } from './utils/trackings'

const games: {
    [gameId: string]: Game
} = {}
let lobby: GameLobby | null

socketIOServer.on('connection', (socket: Socket) => {
    socket.on(PLAYER_JOIN_LOBBY, handlePlayerJoin(socket))
    socket.on(PLAYER_FORCE_START, handlePlayerForceStart(socket))
    socket.on(PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
    socket.on(PLAYER_UNIT, handlePlayerUnit(socket))
    socket.on(PLAYER_MESSAGE_POST, handlePlayerPostMessage(socket))
})

socketIOServer.listen(PORT)

console.log(`Server listening on port ${PORT}`)

const handlePlayerJoin = (socket: Socket) => (playerName: string) => {
    if (!lobby) {
        const futureGameId = newId()
        const socketEmitter = new SocketEmitter(socketIOServer.to(futureGameId))
        lobby = new GameLobby(socketEmitter, futureGameId, (waitingPlayers, sockets) => {
            console.log(`> Lobby ready, starting game with ${waitingPlayers.length} players.`)
            if (lobby) {
                lobby.close()
                lobby = null
            }

            const game = new Game(futureGameId, socketEmitter)
            games[game.id] = game

            for (const waitingPlayer of waitingPlayers) {
                const player = new Player(
                    sockets[waitingPlayer.socketId],
                    pickUnusedColor(game.getPlayers()),
                    waitingPlayer.name
                )
                game.addPlayer(player, waitingPlayer.socketId)
            }

            game.start((gameDurationSeconds) => {
                console.log(`> Game ended, duration: ${gameDurationSeconds} minutes`)
                delete games[futureGameId]
                trackGameEnd(gameDurationSeconds)
            })

            trackGameStart(game.getPlayers().length)
        })
        console.log(`Number of games: ${Object.keys(games).length}`)
    }
    lobby.onPlayerJoin(socket, playerName)
}

const handlePlayerForceStart = (socket: Socket) => (shouldForceStart: boolean) => {
    if (lobby) {
        lobby.handlePlayerForceStart(socket.id, shouldForceStart)
    }
}

const handlePlayerNewUnit = (socket: Socket) => (gameId: string, data: NewUnitDataEvent) => {
    const game = games[gameId]
    if (!game) {
        return
    }
    game.addUnit(socket.id, data)
}

const handlePlayerUnit = (socket: Socket) => (gameId: string, event: UnitAction) => {
    const game = games[gameId]
    if (!game) {
        return
    }
    game.unitEvent(socket.id, event)
}

const handlePlayerPostMessage = (socket: Socket) => (gameId: string, message: string) => {
    console.log('message', gameId, message)
    const game = games[gameId]
    if (!game) {
        return
    }
    game.playerMessage(socket.id, message)
}
