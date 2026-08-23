// Verify what happens to a RUNNING game when the client websocket disconnects & reconnects
// (what the browser experiences on a network blip or a dev-server restart).
import { spawn } from 'node:child_process'
import { io } from 'socket.io-client'

const PORT = 3010
const server = spawn('npx', ['tsx', 'src/server/server.ts'], {
    cwd: new URL('.', import.meta.url).pathname + '..',
    env: { ...process.env, PORT: String(PORT), MIN_PLAYER: '1', IA_PLAYER_PER_GAME: '3' },
    stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`))
server.stderr.on('data', () => {})

let phase = 'booting'
let updatesBefore = 0
let updatesAfter = 0

const finish = (code) => {
    console.log(`\n=== RESULT ===`)
    console.log(`updates before drop: ${updatesBefore}`)
    console.log(`updates after reconnect: ${updatesAfter}`)
    console.log(code === 0 ? 'SEE OUTPUT ABOVE' : 'TIMEOUT')
    try {
        server.kill('SIGTERM')
    } catch {}
    setTimeout(() => process.exit(0), 300)
}
setTimeout(() => finish(1), 45000)

server.stdout.on('data', (d) => {
    if (String(d).includes(`Server started on port ${PORT}`) && phase === 'booting') {
        phase = 'playing'
        start()
    }
})

function start() {
    const socket = io(`http://localhost:${PORT}`, { transports: ['websocket'] })

    socket.on('connect', () => {
        console.log(`[bot] connect (id=${socket.id}) phase=${phase}`)
        // Real client only ever emits this once, in the constructor:
        if (phase === 'playing') socket.emit('c-player/joinLobby', 'DropBot')
    })

    socket.on('s/game/init', (data) => {
        console.log(`[bot] game started: ${data.gameId}, ni=${data.gameState.ni}`)
        setTimeout(() => {
            console.log(`\n>>> SIMULATING WS DROP (socket.io disconnect + reconnect, like a network blip)\n`)
            phase = 'dropped'
            socket.disconnect()
            setTimeout(() => {
                console.log('>>> RECONNECTING with the same client object (new server-side socket id)')
                socket.connect()
            }, 2000)
        }, 4000)
    })

    socket.on('s/gameState', (state) => {
        if (phase === 'dropped' || phase === 'reconnected') updatesAfter++
        else updatesBefore++
        if (phase !== 'reconnected' && socket.connected && phase === 'dropped') {
            phase = 'reconnected'
            console.log('[bot] socket is connected again — watching for game state updates...')
        }
    })
}
