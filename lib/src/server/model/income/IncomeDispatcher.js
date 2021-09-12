'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.IncomeDispatcher = void 0
class IncomeDispatcher {
    constructor(incomeEveryXXMilliseconds) {
        this.incomeEveryXXMilliseconds = incomeEveryXXMilliseconds
        this.lastIncomeDispatched = Date.now()
    }
    update(players) {
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
exports.IncomeDispatcher = IncomeDispatcher
