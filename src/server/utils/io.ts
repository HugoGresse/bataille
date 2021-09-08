import { Server } from 'socket.io'
import { createServer } from 'http'
import { instrument } from '@socket.io/admin-ui'
import { ADMIN_PWD, ADMIN_USER, isProduction, PORT } from './serverEnv'

const httpServer = createServer()

const allowedOrigins = isProduction ? ['https://bataille.ovh', 'https://admin.socket.io'] : '*'

export const socketIOServer = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
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
