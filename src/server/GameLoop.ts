import { Game } from './Game'
import { SocketEmitter } from './SocketEmitter'

const FRAME_RATE = 20
const INTERVAL_SPEED = 1000 / FRAME_RATE

export class GameLoop {
    private intervalId: NodeJS.Timeout | null = null
    public isRunning = false

    constructor(protected emitter: SocketEmitter) {}

    start(game: Game, onGameEnded: (gameDurationSeconds: number) => void) {
        console.log('Loop started')
        const startTime = Date.now()
        this.intervalId = setInterval(() => {
            const winner = this.run(game)

            if (!winner) {
                this.emitGameState(game)
            } else {
                this.stop()
                onGameEnded((Date.now() - startTime) / 1000)
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

    run(game: Game): boolean {
        const endedGame = game.update()

        return endedGame
    }

    emitGameState(game: Game) {
        this.emitter.emitGameUpdate(game)
    }
}
