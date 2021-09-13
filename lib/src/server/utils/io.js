'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.socketIOServer = void 0
const socket_io_1 = require('socket.io')
const http_1 = require('http')
const serverEnv_1 = require('./serverEnv')
const httpServer = http_1.createServer()
const allowedOrigins = serverEnv_1.isProduction ? ['https://bataille.ovh', 'https://admin.socket.io'] : '*'
exports.socketIOServer = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
})
exports.socketIOServer.listen(serverEnv_1.PORT)
