import * as Phaser from 'phaser'
import { GameActions } from '../GameActions'
import { PrivateGameState } from '../../../server/model/GameState'
import { BatailleGame } from '../BatailleGame'
import { UIScene } from './UI/UIScene'
import { BatailleScene } from './bataille/BatailleScene'

export const SCENE_UI_KEY = 'UI'
export const SCENE_BATAILLE_KEY = 'BatailleScene'

export abstract class BaseScene extends Phaser.Scene {
    protected constructor(name: string) {
        super(name)
    }

    public runOnStart(func: () => void) {
        // this.scene/settings may still be null right after game boot (Phaser 4 boots scenes asynchronously)
        if (this.scene?.settings?.active && this.scene.settings.visible) {
            func()
        } else {
            this.events.once('start', func)
        }
    }

    public get actions(): GameActions {
        return this.game.registry.get('actions')
    }

    public getState(): PrivateGameState | null {
        const game = BatailleGame.getCurrentGame()
        if (!game) {
            return null
        }
        return game.getSocket().getLatestState()
    }

    public getCurrentGame(): BatailleGame | null {
        return BatailleGame.getCurrentGame()
    }

    public getUIScene(): UIScene {
        return this.scene.manager.getScene(SCENE_UI_KEY) as UIScene
    }

    public getBatailleScene(): BatailleScene {
        return this.scene.manager.getScene(SCENE_BATAILLE_KEY) as BatailleScene
    }
}
