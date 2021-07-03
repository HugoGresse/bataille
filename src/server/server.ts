import {Server, Socket} from "socket.io"
import {clientRooms} from './state'
import {parseKeyCode} from './utils/parseKeyCode'
import {newId} from './utils/newId'
import {Game} from './Game'
import {Player} from './model/Player'
import {GAME_CLEAR, PLAYER_JOINED, PLAYER_NEW_UNIT, PLAYER_START, PLAYER_UNIT} from '../common/SOCKET_EMIT'
import {UnitAction} from '../common/UnitAction'
import {pickUnusedColor} from './utils/pickUnusedColor'
import {NewUnitDataEvent} from '../common/NewUnitDataEvent'
import {socketIOServer} from './utils/io'
import {PORT} from './utils/serverEnv'

let game = new Game(newId(), socketIOServer)

socketIOServer.on("connection", (socket: Socket) => {
    socket.on('keydown', handleKeydown(socket.id));
    socket.on(PLAYER_JOINED, handlePlayerJoin(socket))
    socket.on(PLAYER_START, handlePlayerStart(socket))
    socket.on(PLAYER_NEW_UNIT, handlePlayerNewUnit(socket))
    socket.on(PLAYER_UNIT, handlePlayerUnit(socket))
    socket.on(GAME_CLEAR, handleClearGame())
});

socketIOServer.listen(PORT)

console.log(`Server listening on port ${PORT}`)


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
    console.log("new player", player)
    game.addPlayer(player, socket, )
}

const handlePlayerStart = (socket: Socket) => () => {
    console.log("Start game, sid", socket.id)
    game.start()
}

const handlePlayerNewUnit = (socket: Socket) => (data: NewUnitDataEvent) => {
    game.addUnit(socket.id, data)
}

const handleClearGame = () => () => {
    game.stopLoop()
    game = new Game(newId(), socketIOServer)
    console.log("clearGame")
}

const handlePlayerUnit = (socket: Socket) => (event: UnitAction) => {
    game.unitEvent(socket.id, event)
}
