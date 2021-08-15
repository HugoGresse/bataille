import { Server } from 'socket.io'

export const socketIOServer = new Server({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
