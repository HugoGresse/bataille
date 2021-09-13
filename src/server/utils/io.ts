import { Server } from 'socket.io'
import { createServer } from 'http'
import { isProduction, PORT } from './serverEnv'

const httpServer = createServer()

const allowedOrigins = isProduction ? ['https://bataille.ovh', 'https://admin.socket.io'] : '*'

export const socketIOServer = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
})

socketIOServer.listen(PORT)
