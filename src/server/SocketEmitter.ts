import { BroadcastOperator } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { Game } from './Game'
import { GAME_MESSAGE, GAME_STATE_INIT, GAME_STATE_UPDATE, LOBBY_STATE } from '../common/SOCKET_EMIT'
import { socketIOServer } from './utils/io'
import { GameLobby } from './GameLobby'
import { AbstractPlayer } from './model/player/AbstractPlayer'
import { GameState, GameStatus, PrivateGameStateUpdate } from './model/GameState'
import { ExportTypeWithGameState } from './model/types/ExportType'

/**
 * Emit events to a specific Socket room provided at construction
 */
export class SocketEmitter {
    private lastGameState: GameState = {
        status: GameStatus.running,
        nextIncome: 0,
        players: [],
        towns: [],
        units: {
            updated: [],
            deleted: [],
        },
    }

    constructor(private sockets: BroadcastOperator<DefaultEventsMap>) {}

    emitLobbyState(lobby: GameLobby) {
        this.sockets.emit(LOBBY_STATE, lobby.export())
    }

    async emitInitialGameState(game: Game) {
        const gameExport = game.export()
        const gameState = game.getState()

        const socketIds = await this.sockets.allSockets()

        socketIds.forEach((socketId) => {
            const data: ExportTypeWithGameState = {
                ...gameExport,
                gameState: {
                    ...gameState,
                    cp: game.getPlayerPrivateState(socketId),
                },
            }
            socketIOServer.to(socketId).emit(GAME_STATE_INIT, data)
        })
        this.lastGameState = gameState
    }

    async emitGameUpdate(game: Game) {
        const gameState = game.getState()

        // this.logUpdate(gameState)

        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => {
            const data: PrivateGameStateUpdate = {
                ...gameState,
                cp: game.getPlayerPrivateStateUpdate(socketId),
            }
            socketIOServer.to(socketId).emit(GAME_STATE_UPDATE, data)
        })

        this.lastGameState = gameState
    }

    logUpdate(gameState: GameState) {
        console.log(`Unit: u:${gameState.units.updated.length} d:${gameState.units.deleted.length}`)
        console.log(`Town: ${gameState.towns.length}`)
    }

    emitMessage(content: string, player?: AbstractPlayer, isUserMessage = false) {
        this.sockets.emit(GAME_MESSAGE, {
            content: content,
            player: player ? player.getPublicPlayerState() : null,
            isUserMessage: isUserMessage,
        })
    }

    async emitMessageToSpecificPlayer(
        content: string,
        destinationSocketId: string,
        player: AbstractPlayer,
        originPlayer?: AbstractPlayer
    ) {
        socketIOServer.to(destinationSocketId).emit(GAME_MESSAGE, {
            content: content,
            player: originPlayer ? originPlayer.getPublicPlayerState() : player.getPublicPlayerState(),
            isUserMessage: !!originPlayer,
        })
    }
}
