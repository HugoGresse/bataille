import {io, Socket} from "socket.io-client"
import {GameState} from '../server/model/GameState'
import {GAME_STATE_UPDATE} from '../common/SOCKET_EMIT'

export class SocketConnection {

    private socket: Socket
    private gameState : GameState | null = null

    constructor(protected socketUrl: string) {
        this.socket = io(socketUrl)

        this.handleGameState = this.handleGameState.bind(this)

        this.socket.on(GAME_STATE_UPDATE, this.handleGameState)
    }

    private handleGameState(gameState: GameState) {
        this.gameState = {
            ...gameState
        }
        // console.log("game state", this.gameState)
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
