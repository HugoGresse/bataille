import { BroadcastOperator } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { Game } from './Game'
import { GAME_MESSAGE, GAME_STATE_INIT, GAME_STATE_UPDATE, LOBBY_STATE } from '../common/SOCKET_EMIT'
import { socketIOServer } from './utils/io'
import { GameLobby } from './GameLobby'
import { AbstractPlayer, Player } from './model/Player'

/**
 * Emit events to a specific Socket room provided at construction
 */
export class SocketEmitter {
    constructor(private sockets: BroadcastOperator<DefaultEventsMap>) {}

    emitLobbyState(lobby: GameLobby) {
        this.sockets.emit(LOBBY_STATE, lobby.export())
    }

    emitInitialGameState(game: Game) {
        this.sockets.emit(GAME_STATE_INIT, game.export())
    }

    async emitGameUpdate(game: Game) {
        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => {
            socketIOServer.to(socketId).emit(GAME_STATE_UPDATE, game.getState(socketId))
        })
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
        player: Player,
        originPlayer?: Player
    ) {
        socketIOServer.to(destinationSocketId).emit(GAME_MESSAGE, {
            content: content,
            player: originPlayer ? originPlayer.getPublicPlayerState() : player.getPublicPlayerState(),
            isUserMessage: !!originPlayer,
        })
    }
}
