import {Manager, Socket} from "socket.io-client"
import {GameState} from '../server/model/GameState'
import {GAME_STATE_INIT, GAME_STATE_UPDATE} from '../common/SOCKET_EMIT'
import {ExportType} from '../server/model/types/ExportType'


// TODO : new BatailleGame only with GameInit is received, + setup scene at this time

export class SocketConnection {

    private socket: Socket
    private gameState: GameState | null = null

    constructor(protected socketUrl: string, protected onGameStart: (data: ExportType) => any) {

        const manager = new Manager(socketUrl, {
            transports: ["websocket"]
        });

        this.socket = manager.socket("/")

        this.socket.on("connection", (socket) => {
            console.log("connected")
        })
        this.socket.on('disconnect', function () {
            console.log("disconnect")

        })
        this.socket.on('reconnect', () => {
            console.log("reconnect")
        })


        this.handleGameState = this.handleGameState.bind(this)
        this.handleGameInit = this.handleGameInit.bind(this)

        this.socket.on(GAME_STATE_INIT, this.handleGameInit)
        this.socket.on(GAME_STATE_UPDATE, this.handleGameState)
    }

    private handleGameInit(data: ExportType) {
        this.onGameStart(data)
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
