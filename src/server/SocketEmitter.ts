import { BroadcastOperator, DefaultEventsMap } from 'socket.io'
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
        s: GameStatus.running,
        ni: 0,
        ps: [],
        t: [],
        u: {
            updated: [],
            deleted: [],
        },
    }

    constructor(private sockets: BroadcastOperator<DefaultEventsMap, unknown>) {}

    emitLobbyState(lobby: GameLobby) {
        this.sockets.emit(LOBBY_STATE, lobby.export())
    }

    async emitInitialGameState(game: Game) {
        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => this.emitInitialGameStateTo(socketId, game))
        this.lastGameState = game.getState()
    }

    /** The whole game as it stands, for one socket: what a player who just came back rebuilds from */
    emitInitialGameStateTo(socketId: string, game: Game) {
        if (!game.hasSocket(socketId)) {
            return // in the room but not (yet) a player of this game
        }
        const data: ExportTypeWithGameState = {
            ...game.export(),
            gameState: {
                ...game.getState(),
                cp: game.getPlayerPrivateState(socketId),
            },
        }
        socketIOServer.to(socketId).emit(GAME_STATE_INIT, data)
    }

    async emitGameUpdate(game: Game) {
        const gameState = game.getState()

        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => {
            if (!game.hasSocket(socketId)) {
                return
            }
            const data: PrivateGameStateUpdate = {
                ...gameState,
                cp: game.getPlayerPrivateStateUpdate(socketId),
            }
            socketIOServer.to(socketId).emit(GAME_STATE_UPDATE, data)
        })

        this.lastGameState = gameState
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
