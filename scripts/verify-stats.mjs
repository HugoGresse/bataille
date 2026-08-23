import { io } from 'socket.io-client'

// 1. human client plays a short game
const game = io('http://localhost:3014', { transports: ['websocket'] })
game.on('connect', () => game.emit('c-player/joinLobby', 'StatsBot'))
game.on('s/game/init', () => console.log('[bot] game started'))

setTimeout(() => {
    game.disconnect() // ends the solo game
}, 6000)

// 2. admin queries stats
setTimeout(() => {
    const admin = io('http://localhost:3014/stats', {
        transports: ['websocket'],
        auth: { token: 'test-admin-key' },
    })
    admin.on('connect', () => {
        console.log('[admin] connected')
        admin.emit(
            'c/admin/action',
            {
                type: 1, // AdminActionsTypes.getStats
                payload: { from: '2000-01-01', to: '2100-01-01' },
            },
            'test-admin-key'
        )
    })
    admin.on('s/admin/stats', (stats) => {
        console.log('[admin] STATS RESPONSE:')
        console.log(JSON.stringify(stats, null, 1))
        process.exit(0)
    })
}, 8000)

setTimeout(() => {
    console.log('TIMEOUT')
    process.exit(1)
}, 15000)
