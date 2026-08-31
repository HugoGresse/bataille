import { Game } from './Game'
import { SocketEmitter } from './SocketEmitter'
import { AbstractPlayer } from './model/player/AbstractPlayer'
import { trackGameEnd } from './utils/trackings'
import { gameStats } from './stats/GameStats'

const FRAME_RATE = 10
const INTERVAL_SPEED = 1000 / FRAME_RATE

export class GameLoop {
    private intervalId: NodeJS.Timeout | null = null
    public isRunning = false
    public gameDuration: number = 0
    public gameStartTS: number = 0

    constructor(
        protected emitter: SocketEmitter,
        private readonly gameId: string
    ) {}

    start(game: Game) {
        this.gameStartTS = Date.now()
        this.intervalId = setInterval(() => {
            const results = this.run(game)

            if (!results) {
                this.emitGameState(game)
            } else {
                // let users speaks at the end of the game...
                this.gameDuration = Math.round(((Date.now() - this.gameStartTS) / 1000 / 60) * 100) / 100
                this.emitGameState(game)
                this.emitter.emitMessage(results.result, results.winner)
                setTimeout(() => {
                    // Don't send 2 message at the same time = not displayed
                    this.emitter.emitMessage(`Game duration: ${this.gameDuration} minutes.`)
                    console.log(`> Game completed, duration: ${this.gameDuration} minutes`)
                }, 1000)
                console.log(results.result)
                console.log(`Humans incomes: ${game.getHumanPlayers().map((p) => p.income)}`)
                this.stop()
            }
        }, INTERVAL_SPEED)
        this.isRunning = true
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.isRunning = false
            trackGameEnd(this.gameDuration)
            gameStats.recordGameEnd(this.gameId, this.gameDuration)
        }
    }

    run(game: Game): { result: string; winner?: AbstractPlayer } | null {
        const endedGame = game.update()

        if (endedGame) {
            const winner = game.getWinner()
            if (!winner) {
                return {
                    result: 'No winner, all players disconnected',
                }
            }
            // Say which of the two ways the game was won: being the last one standing reads for
            // itself, holding the map does not unless the numbers come with it.
            const byDomination = game.getDominantPlayer() === winner
            return {
                result: byDomination
                    ? `This game has been won by ${winner.name}, holding ${winner.townCount} of the ${game.getTownCount()} towns`
                    : `This game has been won by ${winner.name}`,
                winner: winner,
            }
        }

        return null
    }

    emitGameState(game: Game) {
        this.emitter.emitGameUpdate(game)
    }
}
