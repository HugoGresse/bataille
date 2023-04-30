import { Server } from 'socket.io'
import { isProduction, PORT } from './serverEnv'

const allowedOrigins = isProduction ? ['https://bataille.ovh', 'https://admin.socket.io'] : '*'

export const socketIOServer = new Server({
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
})

socketIOServer.listen(PORT)
