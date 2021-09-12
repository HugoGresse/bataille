'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AdminServer = void 0
const SOCKET_EMIT_1 = require('../../common/SOCKET_EMIT')
const serverEnv_1 = require('../utils/serverEnv')
const io_1 = require('../utils/io')
const formatGames_1 = require('./formatGames')
class AdminServer {
    constructor(games) {
        this.games = games
        this.connectedSocket = null
        this.updateInterval = null
        io_1.socketIOServer
            .of(`/${SOCKET_EMIT_1.ADMIN_NAMESPACE}`)
            .on('connection', (socket) => {
                var _a
                if (
                    ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) !==
                    serverEnv_1.ADMIN_KEY
                ) {
                    console.log('<< Not allowed admin access')
                    socket.disconnect(true)
                    return
                }
                this.connectedSocket = socket
                console.log('<< connected to admin', socket.id)
                if (!this.updateInterval) {
                    this.updateInterval = setInterval(() => this.update(), 2000)
                }
                socket.on(SOCKET_EMIT_1.ADMIN_ACTION, this.handleAction(socket))
            })
            .on('disconnect', () => {
                console.log('<< disconnected from admin')
                if (this.updateInterval) {
                    clearInterval(this.updateInterval)
                    this.updateInterval = null
                }
                this.connectedSocket = null
            })
    }
    update() {
        if (!this.connectedSocket) {
            return
        }
        io_1.socketIOServer
            .of(SOCKET_EMIT_1.ADMIN_NAMESPACE)
            .to(this.connectedSocket.id)
            .emit(SOCKET_EMIT_1.ADMIN_UPDATE, formatGames_1.formatGames(this.games))
    }
    handleAction(socket) {
        return ({ type, payload }, token) => {
            if (token !== serverEnv_1.ADMIN_KEY) {
                console.log('<< Not allowed admin access')
                socket.disconnect(true)
                return
            }
            switch (type) {
                case SOCKET_EMIT_1.AdminActionsTypes.sendMessage:
                    console.log(`Send message to all games:`, payload)
                    io_1.socketIOServer.emit(SOCKET_EMIT_1.GAME_MESSAGE, {
                        content: payload.message,
                    })
                    break
                default:
                    console.log('Not managed action', type)
                    break
            }
        }
    }
}
exports.AdminServer = AdminServer
