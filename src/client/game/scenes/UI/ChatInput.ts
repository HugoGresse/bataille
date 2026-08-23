import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { BatailleGame } from '../../BatailleGame'

const ENTER_KEY = 'ENTER'
/** The dialog closes on the same Enter that opened it if we re-arm immediately */
const REARM_MS = 200

/**
 * Enter opens the message dialog and sends what comes back. Display of messages belongs to the
 * notice lanes, not here.
 */
export class ChatInput {
    private enterKey: Phaser.Input.Keyboard.Key

    constructor(private scene: UIScene) {
        this.onEnterPress = this.onEnterPress.bind(this)
        this.enterKey = this.scene.input.keyboard!.addKey(ENTER_KEY, true, false)
        this.enterKey.on('up', this.onEnterPress)
    }

    destroy() {
        this.enterKey.removeAllListeners()
        this.scene.input.keyboard?.removeKey(ENTER_KEY)
    }

    private async onEnterPress() {
        const game = this.scene.getCurrentGame()
        if (!game) {
            return
        }
        const promise = game.onTextRequested()
        this.enterKey.removeAllListeners()
        BatailleGame.setInputEnable(false)
        this.scene.input.keyboard!.disableGlobalCapture()

        const result = await promise
        if (result) {
            this.scene.sendMessage(String(result).trim())
        }

        setTimeout(() => {
            this.enterKey.on('up', this.onEnterPress)
            this.scene.input.keyboard!.enableGlobalCapture()
            BatailleGame.setInputEnable(true)
        }, REARM_MS)
    }
}
