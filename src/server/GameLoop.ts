import {Game} from './Game'
import {GAME_STATE_UPDATE} from '../common/SOCKET_EMIT'
import {BroadcastOperator} from 'socket.io'
import {DefaultEventsMap} from 'socket.io/dist/typed-events'

const FRAME_RATE = 20
const INTERVAL_SPEED = 1000 / FRAME_RATE

export class GameLoop {

    intervalId: NodeJS.Timeout | null = null
    public isRunning = false

    constructor(protected sockets: BroadcastOperator<DefaultEventsMap>) {

    }


    start(game: Game) {
        this.intervalId = setInterval(() => {

            const winner = this.run(game)

            if (!winner) {
                this.emitGameState(game)
            } else {
                this.stop()
                // TODO : cleanup unused data + emit winner
            }
        }, INTERVAL_SPEED)
        this.isRunning = true
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.isRunning = false
        }
    }

    run(game: Game):boolean {
        game.update()

        return false
    }

    emitGameState(game: Game) {
        // console.log(game.getState())
        this.sockets.emit(GAME_STATE_UPDATE, game.getState())
    }

}
