'use strict'
var __assign =
    (this && this.__assign) ||
    function () {
        __assign =
            Object.assign ||
            function (t) {
                for (var s, i = 1, n = arguments.length; i < n; i++) {
                    s = arguments[i]
                    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
                }
                return t
            }
        return __assign.apply(this, arguments)
    }
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
var __generator =
    (this && this.__generator) ||
    function (thisArg, body) {
        var _ = {
                label: 0,
                sent: function () {
                    if (t[0] & 1) throw t[1]
                    return t[1]
                },
                trys: [],
                ops: [],
            },
            f,
            y,
            t,
            g
        return (
            (g = { next: verb(0), throw: verb(1), return: verb(2) }),
            typeof Symbol === 'function' &&
                (g[Symbol.iterator] = function () {
                    return this
                }),
            g
        )
        function verb(n) {
            return function (v) {
                return step([n, v])
            }
        }
        function step(op) {
            if (f) throw new TypeError('Generator is already executing.')
            while (_)
                try {
                    if (
                        ((f = 1),
                        y &&
                            (t =
                                op[0] & 2
                                    ? y['return']
                                    : op[0]
                                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                                    : y.next) &&
                            !(t = t.call(y, op[1])).done)
                    )
                        return t
                    if (((y = 0), t)) op = [op[0] & 2, t.value]
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op
                            break
                        case 4:
                            _.label++
                            return { value: op[1], done: false }
                        case 5:
                            _.label++
                            y = op[1]
                            op = [0]
                            continue
                        case 7:
                            op = _.ops.pop()
                            _.trys.pop()
                            continue
                        default:
                            if (
                                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                                (op[0] === 6 || op[0] === 2)
                            ) {
                                _ = 0
                                continue
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1]
                                break
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1]
                                t = op
                                break
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2]
                                _.ops.push(op)
                                break
                            }
                            if (t[2]) _.ops.pop()
                            _.trys.pop()
                            continue
                    }
                    op = body.call(thisArg, _)
                } catch (e) {
                    op = [6, e]
                    y = 0
                } finally {
                    f = t = 0
                }
            if (op[0] & 5) throw op[1]
            return { value: op[0] ? op[1] : void 0, done: true }
        }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.SocketEmitter = void 0
var SOCKET_EMIT_1 = require('../common/SOCKET_EMIT')
var io_1 = require('./utils/io')
var GameState_1 = require('./model/GameState')
/**
 * Emit events to a specific Socket room provided at construction
 */
var SocketEmitter = /** @class */ (function () {
    function SocketEmitter(sockets) {
        this.sockets = sockets
        this.lastGameState = {
            status: GameState_1.GameStatus.running,
            nextIncome: 0,
            players: [],
            towns: [],
            units: {
                updated: [],
                deleted: [],
            },
        }
    }
    SocketEmitter.prototype.emitLobbyState = function (lobby) {
        this.sockets.emit(SOCKET_EMIT_1.LOBBY_STATE, lobby.export())
    }
    SocketEmitter.prototype.emitInitialGameState = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var gameExport, gameState, socketIds
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        gameExport = game.export()
                        gameState = game.getState()
                        return [4 /*yield*/, this.sockets.allSockets()]
                    case 1:
                        socketIds = _a.sent()
                        socketIds.forEach(function (socketId) {
                            io_1.socketIOServer
                                .to(socketId)
                                .emit(
                                    SOCKET_EMIT_1.GAME_STATE_INIT,
                                    __assign(__assign({}, gameExport), {
                                        gameState: __assign(__assign({}, gameState), {
                                            currentPlayer: game.getPlayerPrivateState(socketId),
                                        }),
                                    })
                                )
                        })
                        this.lastGameState = gameState
                        return [2 /*return*/]
                }
            })
        })
    }
    SocketEmitter.prototype.emitGameUpdate = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var gameState, socketIds
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        gameState = game.getState()
                        return [4 /*yield*/, this.sockets.allSockets()]
                    case 1:
                        socketIds = _a.sent()
                        socketIds.forEach(function (socketId) {
                            io_1.socketIOServer
                                .to(socketId)
                                .emit(
                                    SOCKET_EMIT_1.GAME_STATE_UPDATE,
                                    __assign(__assign({}, gameState), {
                                        currentPlayer: game.getPlayerPrivateState(socketId),
                                    })
                                )
                        })
                        this.lastGameState = gameState
                        return [2 /*return*/]
                }
            })
        })
    }
    SocketEmitter.prototype.logUpdate = function (gameState) {
        console.log('Unit: u:' + gameState.units.updated.length + ' d:' + gameState.units.deleted.length)
        console.log('Town: ' + gameState.towns.length)
    }
    SocketEmitter.prototype.emitMessage = function (content, player, isUserMessage) {
        if (isUserMessage === void 0) {
            isUserMessage = false
        }
        this.sockets.emit(SOCKET_EMIT_1.GAME_MESSAGE, {
            content: content,
            player: player ? player.getPublicPlayerState() : null,
            isUserMessage: isUserMessage,
        })
    }
    SocketEmitter.prototype.emitMessageToSpecificPlayer = function (
        content,
        destinationSocketId,
        player,
        originPlayer
    ) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                io_1.socketIOServer.to(destinationSocketId).emit(SOCKET_EMIT_1.GAME_MESSAGE, {
                    content: content,
                    player: originPlayer ? originPlayer.getPublicPlayerState() : player.getPublicPlayerState(),
                    isUserMessage: !!originPlayer,
                })
                return [2 /*return*/]
            })
        })
    }
    return SocketEmitter
})()
exports.SocketEmitter = SocketEmitter
