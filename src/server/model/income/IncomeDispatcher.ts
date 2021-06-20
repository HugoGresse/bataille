import {Player} from '../Player'

export class IncomeDispatcher {

    private lastIncomeDispatched = Date.now()

    constructor(private incomeEveryXXMilliseconds: number) {
    }

    update(players: { [playerId: string]: Player }) {
        if((Date.now() - this.lastIncomeDispatched) > this.incomeEveryXXMilliseconds) {
            Object.values(players).forEach(player => {
                player.money += player.income
            })
            this.lastIncomeDispatched = Date.now()
        }
    }


}
