import {Server, Socket} from "socket.io"
import {clientRooms} from './state'
import {parseKeyCode} from './utils/parseKeyCode'
import {newId} from './utils/newId'
import {Game} from './Game'
import {Player} from './model/Player'
import {PLAYER_JOINED, PLAYER_NEW_UNIT} from '../constants/SOCKET_EMIT'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

const io = new Server({
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }});

const game = new Game(newId(), io)

io.on("connection", (socket: Socket) => {
    socket.on('keydown', handleKeydown(socket.id));
    socket.on(PLAYER_JOINED, handlePlayerJoin(socket))
    socket.on(PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
});

io.listen(PORT)

console.log(`Server listening on port 3001`)


const handleKeydown = (socketId: string) => (keyCode: string) => {
    const roomName = clientRooms[socketId];
    if (!roomName) {
        return;
    }

    const key = parseKeyCode(keyCode)

    if(!key){
        return
    }

}

const handlePlayerJoin = (socket: Socket) => (playerName: string) => {
    const player = new Player(socket.id, playerName)
    game.addPlayer(player, socket)
}

const handlePlayerNewUnit = (socket: Socket) => () => {
    game.addUnit(socket.id)
}
