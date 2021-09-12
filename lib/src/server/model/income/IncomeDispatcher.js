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
            for (var _i = 0, players_1 = players; _i < players_1.length; _i++) {
                var player = players_1[_i]
                player.money += player.income
            }
            this.lastIncomeDispatched = Date.now()
        }
    }
    IncomeDispatcher.prototype.getNextIncomeDelay = function () {
        var delay = this.incomeEveryXXMilliseconds - (Date.now() - this.lastIncomeDispatched)
        return ~~(delay / 1000)
    }
    return IncomeDispatcher
})()
exports.IncomeDispatcher = IncomeDispatcher
