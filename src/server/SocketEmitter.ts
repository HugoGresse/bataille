import { BroadcastOperator } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { Game } from './Game'
import { GAME_MESSAGE, GAME_STATE_INIT, GAME_STATE_UPDATE, LOBBY_STATE } from '../common/SOCKET_EMIT'
import { socketIOServer } from './utils/io'
import { GameLobby } from './GameLobby'
import { AbstractPlayer } from './model/player/AbstractPlayer'
import { GameState } from './model/GameState'
import * as jsondiffpatch from 'jsondiffpatch'

/**
 * Emit events to a specific Socket room provided at construction
 */
export class SocketEmitter {
    private lastGameState: GameState = {
        status: 'running',
        nextIncome: 0,
        players: [],
        towns: [],
        units: [],
    }
    private diffPatcher

    constructor(private sockets: BroadcastOperator<DefaultEventsMap>) {
        this.diffPatcher = jsondiffpatch.create({
            // objectHash: function(obj) {
            //     return obj.name;
            // }
        })
    }

    emitLobbyState(lobby: GameLobby) {
        this.sockets.emit(LOBBY_STATE, lobby.export())
    }

    async emitInitialGameState(game: Game) {
        const gameExport = game.export()
        const gameState = game.getState()

        const socketIds = await this.sockets.allSockets()

        socketIds.forEach((socketId) => {
            socketIOServer.to(socketId).emit(GAME_STATE_INIT, {
                ...gameExport,
                gameState: {
                    ...gameState,
                    currentPlayer: game.getPlayerPrivateState(socketId),
                },
            })
        })
        this.lastGameState = gameState
    }

    async emitGameUpdate(game: Game) {
        const gameState = game.getState()

        const keys = Object.keys(gameState)
        // @ts-ignore
        console.log(keys.map((key) => `${key}: ${gameState[key].length}`))

        const deltas = this.diffPatcher.diff(this.lastGameState, gameState)

        const socketIds = await this.sockets.allSockets()
        socketIds.forEach((socketId) => {
            socketIOServer.to(socketId).emit(GAME_STATE_UPDATE, {
                deltas: deltas,
                currentPlayer: game.getPlayerPrivateState(socketId),
            })
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
