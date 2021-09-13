import { io, Socket } from 'socket.io-client'
import { PrivateGameState } from '../../server/model/GameState'
import {
    GAME_MESSAGE,
    GAME_STATE_INIT,
    GAME_STATE_UPDATE,
    LOBBY_STATE,
    PLAYER_FORCE_START,
    PLAYER_JOIN_LOBBY,
} from '../../common/SOCKET_EMIT'
import { ExportTypeWithGameState } from '../../server/model/types/ExportType'
import { SOCKET_URL } from './utils/clientEnv'
import { LobbyState } from '../../server/GameLobby'
import { Message } from '../../server/model/types/Message'
import { pickRandomPlayerName } from '../../utils/pickRandomPlayerName'

let socketConnectionInstance: SocketConnection | null = null
export const newSocketConnectionInstance = (
    onLobbyState: (state: LobbyState) => void,
    onGameStart: (gameId: string) => void
) => {
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
    private lastGameState: PrivateGameState | null = null
    private gameStates: PrivateGameState[] = []
    public gameStartData: ExportTypeWithGameState | null = null
    private messageListener: ((message: Message) => void) | null = null

    constructor(
        protected socketUrl: string,
        protected onLobbyState: (state: LobbyState) => void,
        protected onGameStart: (gameId: string) => void
    ) {
        this.socket = io(socketUrl, {
            transports: ['websocket'],
            autoConnect: true,
        })
        this.socket.on('connect', () => {
            console.log('connected')
        })
        this.socket.on('disconnect', function () {
            console.log('disconnect')
            // alert('You ware disconnected from the server (or unlikely the server crashed)')
            // window.location.replace('/')
        })
        this.socket.on('reconnect', () => {
            console.log('reconnect')
        })

        this.handleLobbyState = this.handleLobbyState.bind(this)
        this.handleGameState = this.handleGameState.bind(this)
        this.handleGameInit = this.handleGameInit.bind(this)
        this.handleGameMessage = this.handleGameMessage.bind(this)

        this.socket.on(LOBBY_STATE, this.handleLobbyState)
        this.socket.on(GAME_STATE_INIT, this.handleGameInit)
        this.socket.on(GAME_STATE_UPDATE, this.handleGameState)
        this.socket.on(GAME_MESSAGE, this.handleGameMessage)
        this.socket.emit(PLAYER_JOIN_LOBBY, pickRandomPlayerName())
    }

    public sendForceStart(shouldForceStart: boolean) {
        this.socket.emit(PLAYER_FORCE_START, shouldForceStart)
    }

    private handleLobbyState(state: LobbyState) {
        this.onLobbyState(state)
    }

    private handleGameInit(data: ExportTypeWithGameState) {
        this.onGameStart(data.gameId)
        this.gameStartData = data
        this.gameStates.push(data.gameState)
    }

    private handleGameState(gameState: PrivateGameState) {
        this.gameStates.push(gameState)
        this.lastGameState = gameState
    }

    private handleGameMessage(message: Message) {
        if (this.messageListener) {
            this.messageListener(message)
        }
    }

    public disconnect() {
        this.socket.disconnect()
    }

    public getStateUpdate(): PrivateGameState | undefined {
        return this.gameStates.shift()
    }
    public getLatestState(): PrivateGameState | null {
        return this.lastGameState
    }

    public getSocketIO() {
        return this.socket
    }

    public setMessageListener(listener: ((message: Message) => void) | null) {
        this.messageListener = listener
    }
}
