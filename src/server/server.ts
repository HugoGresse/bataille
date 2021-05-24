import {Server, Socket} from "socket.io"
import {clientRooms} from './state'
import {parseKeyCode} from './utils/parseKeyCode'
import {newId} from './utils/newId'
import {Game} from './Game'
import {Player} from './model/Player'
import {GAME_CLEAR, PLAYER_JOINED, PLAYER_NEW_UNIT, PLAYER_UNIT} from '../common/SOCKET_EMIT'
import {UnitAction} from '../common/UnitAction'
import {pickUnusedColor} from './utils/pickUnusedColor'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

const io = new Server({
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }});

let game = new Game(newId(), io)

io.on("connection", (socket: Socket) => {
    socket.on('keydown', handleKeydown(socket.id));
    socket.on(PLAYER_JOINED, handlePlayerJoin(socket))
    socket.on(PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
    socket.on(PLAYER_UNIT, handlePlayerUnit(socket))
    socket.on(GAME_CLEAR, handleClearGame())
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
    const player = new Player(socket.id, pickUnusedColor(game.getPlayers()), playerName, )
    game.addPlayer(player, socket, )
}

const handlePlayerNewUnit = (socket: Socket) => () => {
    game.addUnit(socket.id)
}

const handleClearGame = () => () => {
    game.stopLoop()
    game = new Game(newId(), io)
    console.log("clearGame")
}

const handlePlayerUnit = (socket: Socket) => (event: UnitAction) => {
    game.unitEvent(socket.id, event)
}
