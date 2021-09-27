'use strict'
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value)
                  })
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value))
                } catch (e) {
                    reject(e)
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value))
                } catch (e) {
                    reject(e)
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected)
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next())
        })
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.SocketEmitter = void 0
const SOCKET_EMIT_1 = require('../common/SOCKET_EMIT')
const io_1 = require('./utils/io')
const GameState_1 = require('./model/GameState')
/**
 * Emit events to a specific Socket room provided at construction
 */
class SocketEmitter {
    constructor(sockets) {
        this.sockets = sockets
        this.lastGameState = {
            s: GameState_1.GameStatus.running,
            ni: 0,
            ps: [],
            t: [],
            u: {
                updated: [],
                deleted: [],
            },
        }
    }
    emitLobbyState(lobby) {
        this.sockets.emit(SOCKET_EMIT_1.LOBBY_STATE, lobby.export())
    }
    emitInitialGameState(game) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameExport = game.export()
            const gameState = game.getState()
            const socketIds = yield this.sockets.allSockets()
            socketIds.forEach((socketId) => {
                const data = Object.assign(Object.assign({}, gameExport), {
                    gameState: Object.assign(Object.assign({}, gameState), {
                        cp: game.getPlayerPrivateState(socketId),
                    }),
                })
                io_1.socketIOServer.to(socketId).emit(SOCKET_EMIT_1.GAME_STATE_INIT, data)
            })
            this.lastGameState = gameState
        })
    }
    emitGameUpdate(game) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameState = game.getState()
            const socketIds = yield this.sockets.allSockets()
            socketIds.forEach((socketId) => {
                const data = Object.assign(Object.assign({}, gameState), {
                    cp: game.getPlayerPrivateStateUpdate(socketId),
                })
                io_1.socketIOServer.to(socketId).emit(SOCKET_EMIT_1.GAME_STATE_UPDATE, data)
            })
            this.lastGameState = gameState
        })
    }
    emitMessage(content, player, isUserMessage = false) {
        this.sockets.emit(SOCKET_EMIT_1.GAME_MESSAGE, {
            content: content,
            player: player ? player.getPublicPlayerState() : null,
            isUserMessage: isUserMessage,
        })
    }
    emitMessageToSpecificPlayer(content, destinationSocketId, player, originPlayer) {
        return __awaiter(this, void 0, void 0, function* () {
            io_1.socketIOServer.to(destinationSocketId).emit(SOCKET_EMIT_1.GAME_MESSAGE, {
                content: content,
                player: originPlayer ? originPlayer.getPublicPlayerState() : player.getPublicPlayerState(),
                isUserMessage: !!originPlayer,
            })
        })
    }
}
exports.SocketEmitter = SocketEmitter
