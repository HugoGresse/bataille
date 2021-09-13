'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.IncomeDispatcher = void 0
class IncomeDispatcher {
    constructor(incomeEveryXXMilliseconds) {
        this.incomeEveryXXMilliseconds = incomeEveryXXMilliseconds
        this.lastIncomeDispatched = Date.now()
    }
    /**
     * Return true if income has been added to player's moneys
     */
    update(players) {
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
exports.IncomeDispatcher = IncomeDispatcher
