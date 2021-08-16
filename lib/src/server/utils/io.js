'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.socketIOServer = void 0
var socket_io_1 = require('socket.io')
exports.socketIOServer = new socket_io_1.Server({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
