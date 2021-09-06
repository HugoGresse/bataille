import { Server } from 'socket.io'
import { createServer } from 'http'
import { instrument } from '@socket.io/admin-ui'
import { ADMIN_PWD, ADMIN_USER, PORT } from './serverEnv'

const httpServer = createServer()

export const socketIOServer = new Server(httpServer, {
    cors: {
        origin: ['https://bataille.ovh', 'https://admin.socket.io'],
        credentials: true,
    },
})
instrument(socketIOServer, {
    auth: {
        type: 'basic',
        username: ADMIN_USER,
        password: ADMIN_PWD,
    },
})

socketIOServer.listen(PORT)
