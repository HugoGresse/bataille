import { io, Socket } from 'socket.io-client'
import { PrivateGameState, PrivateGameStateUpdate, PrivatePlayerState } from '../../server/model/GameState'
import {
    GAME_MESSAGE,
    GAME_REJOIN_FAILED,
    GAME_STATE_INIT,
    GAME_STATE_UPDATE,
    LOBBY_STATE,
    PLAYER_FORCE_START,
    PLAYER_JOIN_LOBBY,
    PLAYER_LOBBY_WAIT_FOR_HUMAN,
    PLAYER_REJOIN,
} from '../../common/SOCKET_EMIT'
import { ExportTypeWithGameState } from '../../server/model/types/ExportType'
import { SOCKET_URL } from './utils/clientEnv'
import { LobbyState } from '../../server/GameLobby'
import { Message } from '../../server/model/types/Message'
import { pickRandomPlayerName } from '../../utils/pickRandomPlayerName'
import { getSavedPlayerName } from '../utils/cookie'
import { appendMessage, ReceivedMessage } from './chat/chatLog'
import { readSessionToken } from './session'

/** lost: the socket dropped mid-game. rejoined: the seat is ours again. gone: nothing to come back to */
export type ConnectionPhase = 'lost' | 'rejoined' | 'gone'

type SocketConnectionOptions = {
    /** Never enter the lobby: the page reloaded mid-game and only wants its seat back */
    rejoinOnly?: boolean
}

let socketConnectionInstance: SocketConnection | null = null
export const newSocketConnectionInstance = (
    onLobbyState: (state: LobbyState) => void,
    onGameStart: (gameId: string) => void,
    options: SocketConnectionOptions = {}
) => {
    if (socketConnectionInstance) {
        socketConnectionInstance.disconnect()
    }
    socketConnectionInstance = new SocketConnection(SOCKET_URL, onLobbyState, onGameStart, options)
}
export const getSocketConnectionInstance = () => {
    return socketConnectionInstance
}

export class SocketConnection {
    private socket: Socket
    private lastGameState: PrivateGameStateUpdate | null = null
    private latestStateMemo: PrivateGameState | null = null
    private latestStateMemoSource: PrivateGameStateUpdate | null = null
    private gameStates: PrivateGameStateUpdate[] = []
    public gameStartData: ExportTypeWithGameState | null = null
    private messageLog: ReceivedMessage[] = []
    private messageListeners = new Set<(message: Message) => void>()
    private connectionListener: ((phase: ConnectionPhase) => void) | null = null
    private readonly sessionToken = readSessionToken()
    private readonly rejoinOnly: boolean

    constructor(
        protected socketUrl: string,
        protected onLobbyState: (state: LobbyState) => void,
        protected onGameStart: (gameId: string) => void,
        { rejoinOnly = false }: SocketConnectionOptions = {}
    ) {
        this.rejoinOnly = rejoinOnly
        this.socket = io(socketUrl, {
            transports: ['websocket'],
            autoConnect: true,
        })
        this.socket.on('connect', () => {
            // Every connection, the first one included, says who it is. Mid-game it asks for its
            // seat back rather than a new lobby slot: the server holds the seat for a grace period.
            if (this.gameStartData || this.rejoinOnly) {
                this.socket.emit(PLAYER_REJOIN, this.sessionToken)
            } else {
                this.socket.emit(PLAYER_JOIN_LOBBY, SocketConnection.getPlayerName(), this.sessionToken)
            }
        })
        this.socket.on('disconnect', (reason: string) => {
            // Intentional disconnects (exit game, lobby re-creation) are ignored. On an unexpected
            // drop the socket reconnects by itself and the connect handler asks for the seat back.
            if (reason !== 'io client disconnect' && this.gameStartData) {
                this.connectionListener?.('lost')
            }
        })

        this.handleLobbyState = this.handleLobbyState.bind(this)
        this.handleGameState = this.handleGameState.bind(this)
        this.handleGameInit = this.handleGameInit.bind(this)
        this.handleGameMessage = this.handleGameMessage.bind(this)

        this.socket.on(LOBBY_STATE, this.handleLobbyState)
        this.socket.on(GAME_STATE_INIT, this.handleGameInit)
        this.socket.on(GAME_STATE_UPDATE, this.handleGameState)
        this.socket.on(GAME_MESSAGE, this.handleGameMessage)
        this.socket.on(GAME_REJOIN_FAILED, () => this.connectionListener?.('gone'))
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
        // A second init is the whole game handed back after a drop: whatever deltas were missed
        // no longer matter, the full state replaces them
        const rejoined = this.gameStartData !== null || this.rejoinOnly
        this.gameStartData = data
        this.gameStates = [data.gameState]
        this.lastGameState = data.gameState
        if (rejoined) {
            this.connectionListener?.('rejoined')
        } else {
            this.onGameStart(data.gameId)
        }
    }

    private handleGameState(gameState: PrivateGameStateUpdate) {
        this.gameStates.push(gameState)
        this.lastGameState = gameState
    }

    private handleGameMessage(message: Message) {
        this.messageLog = appendMessage(this.messageLog, message, Date.now())
        this.messageListeners.forEach((listener) => listener(message))
    }

    public disconnect() {
        this.socket.disconnect()
    }

    public getStateUpdate(): PrivateGameStateUpdate | undefined {
        return this.gameStates.shift()
    }

    /**
     * Read by the HUD several times per rendered frame: the merged view is cached per received
     * state so frames between two server ticks cost no allocation and return a stable reference.
     */
    public getLatestState(): PrivateGameState | null {
        if (!this.lastGameState) {
            return null
        }
        if (this.latestStateMemo && this.latestStateMemoSource === this.lastGameState) {
            return this.latestStateMemo
        }
        const privatePlayerState: PrivatePlayerState = this.gameStartData!.gameState!.cp
        const currentUserIncome = this.lastGameState.ps.find((p) => p.n === privatePlayerState.n)!.i
        this.latestStateMemoSource = this.lastGameState
        this.latestStateMemo = {
            ...this.lastGameState,
            cp: {
                ...privatePlayerState,
                m: this.lastGameState.cp.m,
                i: currentUserIncome,
            },
        }
        return this.latestStateMemo
    }

    public setConnectionListener(listener: ((phase: ConnectionPhase) => void) | null) {
        this.connectionListener = listener
    }

    public getSocketIO() {
        return this.socket
    }

    /** Everything received this game, newest last: what the chat window scrolls back through */
    public getMessageLog(): ReceivedMessage[] {
        return this.messageLog
    }

    /** @return the unsubscribe function */
    public addMessageListener(listener: (message: Message) => void): () => void {
        this.messageListeners.add(listener)
        return () => {
            this.messageListeners.delete(listener)
        }
    }

    private static getPlayerName(): string {
        const playerName = getSavedPlayerName()
        if (!playerName || playerName.length < 2 || playerName.length > 20) {
            return pickRandomPlayerName()
        }
        return playerName
    }
}
