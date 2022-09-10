import { io, Socket } from 'socket.io-client'
import { PrivateGameState, PrivateGameStateUpdate, PrivatePlayerState } from '../../server/model/GameState'
import {
    GAME_MESSAGE,
    GAME_STATE_INIT,
    GAME_STATE_UPDATE,
    LOBBY_STATE,
    PLAYER_FORCE_START,
    PLAYER_JOIN_LOBBY,
    PLAYER_LOBBY_WAIT_FOR_HUMAN,
} from '../../common/SOCKET_EMIT'
import { ExportTypeWithGameState } from '../../server/model/types/ExportType'
import { SOCKET_URL } from './utils/clientEnv'
import { LobbyState } from '../../server/GameLobby'
import { Message } from '../../server/model/types/Message'
import { pickRandomPlayerName } from '../../utils/pickRandomPlayerName'
import { getSavedPlayerName } from '../utils/cookie'

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
    private lastGameState: PrivateGameStateUpdate | null = null
    private gameStates: PrivateGameStateUpdate[] = []
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
        this.socket.emit(PLAYER_JOIN_LOBBY, SocketConnection.getPlayerName())
    }

    public sendForceStart(shouldForceStart: boolean) {
        this.socket.emit(PLAYER_FORCE_START, shouldForceStart)
    }

    public sendWaitForHuman() {
        this.socket.emit(PLAYER_LOBBY_WAIT_FOR_HUMAN)
    }

    private handleLobbyState(state: LobbyState) {
        this.onLobbyState(state)
    }

    private handleGameInit(data: ExportTypeWithGameState) {
        this.onGameStart(data.gameId)
        this.gameStartData = data
        this.gameStates.push(data.gameState)
    }

    private handleGameState(gameState: PrivateGameStateUpdate) {
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

    public getStateUpdate(): PrivateGameStateUpdate | undefined {
        return this.gameStates.shift()
    }

    public getLatestState(): PrivateGameState | null {
        const privatePlayerState: PrivatePlayerState = this.gameStartData!.gameState!.cp

        if (this.lastGameState) {
            const currentUserIncome = this.lastGameState.ps.find((p) => p.n === privatePlayerState.n)!.i
            return {
                ...this.lastGameState,
                cp: {
                    ...privatePlayerState,
                    m: this.lastGameState.cp.m,
                    i: currentUserIncome,
                },
            }
        }
        return null
    }

    public getSocketIO() {
        return this.socket
    }

    public setMessageListener(listener: ((message: Message) => void) | null) {
        this.messageListener = listener
    }

    private static getPlayerName(): string {
        const playerName = getSavedPlayerName()
        if (!playerName || playerName.length < 2 || playerName.length > 20) {
            return pickRandomPlayerName()
        }
        return playerName
    }
}
