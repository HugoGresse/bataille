'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AdminServer = void 0
var SOCKET_EMIT_1 = require('../../common/SOCKET_EMIT')
var serverEnv_1 = require('../utils/serverEnv')
var io_1 = require('../utils/io')
var formatGames_1 = require('./formatGames')
var AdminServer = /** @class */ (function () {
    function AdminServer(games) {
        var _this = this
        this.games = games
        this.connectedSocket = null
        this.updateInterval = null
        io_1.socketIOServer
            .of('/' + SOCKET_EMIT_1.ADMIN_NAMESPACE)
            .on('connection', function (socket) {
                var _a
                if (
                    ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) !==
                    serverEnv_1.ADMIN_KEY
                ) {
                    console.log('<< Not allowed admin access')
                    socket.disconnect(true)
                    return
                }
                _this.connectedSocket = socket
                console.log('<< connected to admin', socket.id)
                if (!_this.updateInterval) {
                    _this.updateInterval = setInterval(function () {
                        return _this.update()
                    }, 2000)
                }
                socket.on(SOCKET_EMIT_1.ADMIN_ACTION, _this.handleAction(socket))
            })
            .on('disconnect', function () {
                console.log('<< disconnected from admin')
                if (_this.updateInterval) {
                    clearInterval(_this.updateInterval)
                    _this.updateInterval = null
                }
                _this.connectedSocket = null
            })
    }
    AdminServer.prototype.update = function () {
        if (!this.connectedSocket) {
            return
        }
        io_1.socketIOServer
            .of(SOCKET_EMIT_1.ADMIN_NAMESPACE)
            .to(this.connectedSocket.id)
            .emit(SOCKET_EMIT_1.ADMIN_UPDATE, formatGames_1.formatGames(this.games))
    }
    AdminServer.prototype.handleAction = function (socket) {
        return function (_a, token) {
            var type = _a.type,
                payload = _a.payload
            if (token !== serverEnv_1.ADMIN_KEY) {
                console.log('<< Not allowed admin access')
                socket.disconnect(true)
                return
            }
            switch (type) {
                case SOCKET_EMIT_1.AdminActionsTypes.sendMessage:
                    console.log('Send message to all games:', payload)
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
    return AdminServer
})()
exports.AdminServer = AdminServer
