import { Game } from './Game'
import { SocketEmitter } from './SocketEmitter'
import { Player } from './model/Player'

const FRAME_RATE = 20
const INTERVAL_SPEED = 1000 / FRAME_RATE

export class GameLoop {
    private intervalId: NodeJS.Timeout | null = null
    public isRunning = false
    private gameCompleted = false
    private gameDuration: number = 0

    constructor(protected emitter: SocketEmitter) {}

    start(game: Game, onGameEnded: (gameDurationSeconds: number) => void) {
        console.log('Loop started')
        const startTime = Date.now()
        this.intervalId = setInterval(() => {
            const results = this.run(game)

            if (!results) {
                this.emitGameState(game)
            } else if (!this.gameCompleted) {
                // let users speaks at the end of the game...
                this.gameDuration = Math.round(((Date.now() - startTime) / 1000 / 60) * 100) / 100
                this.gameCompleted = true
                this.emitGameState(game)
                this.emitter.emitMessage(results.result, results.winner)
                setTimeout(() => {
                    // Don't send 2 message at the same time = not displayed
                    this.emitter.emitMessage(`Game duration: ${this.gameDuration} minutes.`)
                }, 1000)
                console.log(results.result)
                console.log(`income: ${results.winner?.income}`)
            }
            const connectedPlayers = game.getConnectedPlayers().length
            if (!connectedPlayers) {
                this.stop()
                onGameEnded(this.gameDuration)
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

        if (endedGame && !this.gameCompleted) {
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
