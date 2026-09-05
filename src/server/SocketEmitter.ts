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
        const snapshot = this.snapshotOf(game)
        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => this.emitInitialGameStateTo(socketId, game, snapshot))
        this.lastGameState = snapshot.gameState
    }

    /**
     * The whole board as it stands, for one socket: what a client builds from, at kick-off and on
     * every return. The full state, not the last tick's delta - a returning player must see the
     * stacks that have not moved in a while too.
     */
    emitInitialGameStateTo(socketId: string, game: Game, snapshot = this.snapshotOf(game)) {
        if (!game.hasSocket(socketId)) {
            return // in the room but not (yet) a player of this game
        }
        const data: ExportTypeWithGameState = {
            ...snapshot.gameExport,
            gameState: {
                ...snapshot.gameState,
                cp: game.getPlayerPrivateState(socketId),
            },
        }
        socketIOServer.to(socketId).emit(GAME_STATE_INIT, data)
    }

    /** Taken once per broadcast: the map export alone walks every tile */
    private snapshotOf(game: Game) {
        return { gameExport: game.export(), gameState: game.getFullState() }
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
