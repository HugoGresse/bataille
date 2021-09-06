'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.socketIOServer = void 0
var socket_io_1 = require('socket.io')
var http_1 = require('http')
var admin_ui_1 = require('@socket.io/admin-ui')
var serverEnv_1 = require('./serverEnv')
var httpServer = http_1.createServer()
exports.socketIOServer = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ['https://bataille.ovh', 'https://admin.socket.io'],
        credentials: true,
    },
})
admin_ui_1.instrument(exports.socketIOServer, {
    auth: {
        type: 'basic',
        username: serverEnv_1.ADMIN_USER,
        password: serverEnv_1.ADMIN_PWD,
    },
})
exports.socketIOServer.listen(serverEnv_1.PORT)
