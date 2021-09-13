import { AbstractPlayer } from '../player/AbstractPlayer'

export class IncomeDispatcher {
    private lastIncomeDispatched = Date.now()

    constructor(private incomeEveryXXMilliseconds: number) {}

    /**
     * Return true if income has been added to player's moneys
     */
    update(players: AbstractPlayer[]): boolean {
        if (Date.now() - this.lastIncomeDispatched > this.incomeEveryXXMilliseconds) {
            for (const player of players) {
                player.money += player.income
            }
            this.lastIncomeDispatched = Date.now()
            return true
        }
        return false
    }

    getNextIncomeDelay() {
        const delay = this.incomeEveryXXMilliseconds - (Date.now() - this.lastIncomeDispatched)
        return ~~(delay / 1000)
    }
}
