import { AbstractPlayer } from '../player/AbstractPlayer'

export class IncomeDispatcher {
    private lastIncomeDispatched = Date.now()

    constructor(private incomeEveryXXMilliseconds: number) {}

    update(players: AbstractPlayer[]) {
        if (Date.now() - this.lastIncomeDispatched > this.incomeEveryXXMilliseconds) {
            for (const player of players) {
                player.money += player.income
            }
            this.lastIncomeDispatched = Date.now()
        }
    }

    getNextIncomeDelay() {
        const delay = this.incomeEveryXXMilliseconds - (Date.now() - this.lastIncomeDispatched)
        return ~~(delay / 1000)
    }
}
