'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.IncomeDispatcher = void 0
var IncomeDispatcher = /** @class */ (function () {
    function IncomeDispatcher(incomeEveryXXMilliseconds) {
        this.incomeEveryXXMilliseconds = incomeEveryXXMilliseconds
        this.lastIncomeDispatched = Date.now()
    }
    IncomeDispatcher.prototype.update = function (players) {
        if (Date.now() - this.lastIncomeDispatched > this.incomeEveryXXMilliseconds) {
            Object.values(players).forEach(function (player) {
                player.money += player.income
            })
            this.lastIncomeDispatched = Date.now()
        }
        this.getNextIncomeDelay()
    }
    IncomeDispatcher.prototype.getNextIncomeDelay = function () {
        var delay = this.incomeEveryXXMilliseconds - (Date.now() - this.lastIncomeDispatched)
        return ~~(delay / 1000)
    }
    return IncomeDispatcher
})()
exports.IncomeDispatcher = IncomeDispatcher
