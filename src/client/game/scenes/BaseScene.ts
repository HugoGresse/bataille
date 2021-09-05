import { GameActions } from '../GameActions'
import { PrivateGameState } from '../../../server/model/GameState'
import { BatailleGame } from '../BatailleGame'
import { UIScene } from './UI/UIScene'

export const SCENE_UI_KEY = 'UI'

export abstract class BaseScene extends Phaser.Scene {
    protected constructor(name: string) {
        super(name)
    }

    public runOnStart(func: () => void) {
        if (this.scene.settings.active && this.scene.settings.visible) {
            func()
        } else {
            this.events.on('start', () => {
                func()
                this.events.off('start')
            })
            this.events.on('destroy', () => {
                this.events.off('start')
            })
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
}
