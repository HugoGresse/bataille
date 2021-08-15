import { GameActions } from '../GameActions'
import { GameState } from '../../../server/model/GameState'
import { BatailleGame } from '../BatailleGame'
import { UIScene } from './UI/UIScene'

export const SCENE_UI_KEY = 'UI'

export abstract class BaseScene extends Phaser.Scene {
    protected constructor(name: string) {
        super(name)
    }

    public get actions(): GameActions {
        return this.game.registry.get('actions')
    }

    public getState(): GameState | null {
        return BatailleGame.getCurrentGame().getSocket().getLatestState()
    }

    public getUIScene(): UIScene {
        return this.scene.manager.getScene(SCENE_UI_KEY) as UIScene
    }
}
