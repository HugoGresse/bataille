import {Game} from './Game'
import {SocketEmitter} from './SocketEmitter'
import {Map} from './model/map/Map'

const FRAME_RATE = 20
const INTERVAL_SPEED = 1000 / FRAME_RATE

export class GameLoop {

    intervalId: NodeJS.Timeout | null = null
    public isRunning = false

    constructor(protected emitter: SocketEmitter) {

    }


    start(game: Game) {
        console.log("Loop started")
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
        this.emitter.emitGameUpdate(game)
    }

}
