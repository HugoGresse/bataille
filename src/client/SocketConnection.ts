import {io, Socket} from "socket.io-client"
import {GameState} from '../server/model/GameState'
import {GAME_STATE_INIT, GAME_STATE_UPDATE, LOBBY_STATE, PLAYER_JOIN_LOBBY} from '../common/SOCKET_EMIT'
import {ExportType} from '../server/model/types/ExportType'
import {SOCKET_URL} from './game/utils/clientEnv'
import {LOTR_NAMES} from './utils/LOTR_NAMES'
import {LobbyState} from '../server/GameLobby'


let socketConnectionInstance: SocketConnection | null = null
export const newSocketConnectionInstance = (onLobbyState: (state: LobbyState) => void, onGameStart: (gameId: string) => void) => {
    if (socketConnectionInstance) {
        socketConnectionInstance.disconnect()
    }
    socketConnectionInstance = new SocketConnection(SOCKET_URL, onLobbyState, onGameStart)
}
export const getSocketConnectionInstance = () => {
    return socketConnectionInstance
}

export class SocketConnection {

    private socket: Socket
    private gameState: GameState | null = null
    public gameStartData: ExportType | null = null

    constructor(protected socketUrl: string, protected onLobbyState: (state: LobbyState) => void, protected onGameStart: (gameId: string) => void) {
        this.socket = io(socketUrl)

        this.socket.on("connection", () => {
            console.log("connected")
        })
        this.socket.on('disconnect', function () {
            console.log("disconnect")

        })
        this.socket.on('reconnect', () => {
            console.log("reconnect")
        })

        this.handleLobbyState = this.handleLobbyState.bind(this)
        this.handleGameState = this.handleGameState.bind(this)
        this.handleGameInit = this.handleGameInit.bind(this)

        this.socket.on(LOBBY_STATE, this.handleLobbyState)
        this.socket.on(GAME_STATE_INIT, this.handleGameInit)
        this.socket.on(GAME_STATE_UPDATE, this.handleGameState)
        this.socket.emit(PLAYER_JOIN_LOBBY, LOTR_NAMES[Math.floor(Math.random() * LOTR_NAMES.length)])
    }

    private handleLobbyState(state: LobbyState) {
        this.onLobbyState(state)
    }

    private handleGameInit(data: ExportType) {
        this.onGameStart(data.gameId)
        this.gameStartData = data
    }

    private handleGameState(gameState: GameState) {
        this.gameState = {
            ...gameState
        }
    }

    public disconnect() {
        this.socket.disconnect()
    }

    public getLatestState(): GameState | null {
        return this.gameState
    }

    public getSocketIO() {
        return this.socket
    }

}
