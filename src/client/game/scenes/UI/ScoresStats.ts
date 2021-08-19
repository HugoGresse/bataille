import { BaseScene } from '../BaseScene'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'

const Y_MARGIN = 20

const BACKGROUND_WIDTH = 200

export class ScoresStats {
    playersTexts: {
        [playerId: string]: Phaser.GameObjects.Text
    } = {}
    playerYPosition: number
    startX: number
    background: Phaser.GameObjects.Rectangle
    backgroundAdjusted: boolean = false

    constructor(scene: Phaser.Scene) {
        this.startX = 20
        const startYPosition = 100 + Y_MARGIN
        this.background = scene.add.rectangle(0, 100 + 10, BACKGROUND_WIDTH, Y_MARGIN * 2)
        this.background.setFillStyle(0x000000, 0.5)
        this.background.setOrigin(0, 0)
        scene.add.text(this.startX, startYPosition, 'Players incomes', TEXT_STYLE)
        this.playerYPosition = startYPosition + Y_MARGIN
    }

    update(scene: BaseScene) {
        const state = scene.getState()
        const players = state?.players

        players?.forEach((player) => {
            const playerText = `- ${player.name}: ${player.income}${player.connected ? '' : ' ❌'}`
            if (!this.playersTexts[player.name]) {
                this.playersTexts[player.name] = scene.add.text(
                    this.startX,
                    this.playerYPosition,
                    playerText,
                    TEXT_STYLE
                )
                this.playersTexts[player.name].setColor('#' + player.color.replace('0x', ''))
                this.playerYPosition = this.playerYPosition + Y_MARGIN
            } else if (this.playersTexts[player.name].text !== playerText) {
                this.playersTexts[player.name].text = playerText
            }
        })
        if (!this.backgroundAdjusted && players) {
            this.background.height = players?.length * Y_MARGIN + Y_MARGIN * 2
            this.backgroundAdjusted = true
        }
    }
}
