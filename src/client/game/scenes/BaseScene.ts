import {GameActions} from '../GameActions'
import {GameState} from '../../../server/model/GameState'
import {BatailleGame} from '../BatailleGame'

export abstract class BaseScene extends Phaser.Scene {
    protected constructor(name: string) {
        super(name)
    }

    public get actions(): GameActions {
        return this.game.registry.get('actions')
    }

    protected getState() : GameState | null {
        return BatailleGame.getCurrentGame().getSocket().getLatestState()
    }
}
