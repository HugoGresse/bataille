import { Game } from './Game'
import { SocketEmitter } from './SocketEmitter'
import { Player } from './model/Player'

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
            const results = this.run(game)

            if (!results) {
                this.emitGameState(game)
            } else {
                const gameDurationMinutes = (Date.now() - startTime) / 1000 / 60
                this.emitter.emitMessage(results.result, results.winner)
                this.emitter.emitMessage(`Game duration: ${gameDurationMinutes} minutes.`)
                console.log(results)
                this.stop()
                onGameEnded(gameDurationMinutes)
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

    run(game: Game): { result: string; winner?: Player } | null {
        const endedGame = game.update()

        if (endedGame) {
            const winner = game.getWinner()
            if (!winner) {
                return {
                    result: 'No winner, all players disconnected',
                }
            }
            return {
                result: `This game has been won by ${winner.name}`,
                winner: winner,
            }
        }

        return null
    }

    emitGameState(game: Game) {
        this.emitter.emitGameUpdate(game)
    }
}
