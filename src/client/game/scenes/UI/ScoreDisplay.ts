import {BaseScene} from '../BaseScene'
import {TEXT_STYLE} from '../../../utils/TEXT_STYLE'

const LEFT_MARGIN = 20
const Y_MARGIN = 20

const BACKGROUND_WIDTH = 200

export class ScoreDisplay {

    incomeText: Phaser.GameObjects.Text
    moneyText: Phaser.GameObjects.Text
    nameText: Phaser.GameObjects.Text
    nextIncomeText: Phaser.GameObjects.Text
    playersTexts: {
        [playerId: string]: Phaser.GameObjects.Text
    } = {}
    playerYPosition: number

    constructor(scene: Phaser.Scene) {
        let startYPosition = 10
        const rectangle = scene.add.rectangle(BACKGROUND_WIDTH/2, 100, BACKGROUND_WIDTH, 220)
        rectangle.setFillStyle(0x000000, 0.5)
        this.nameText = scene.add.text(LEFT_MARGIN, startYPosition, 'Name: ', TEXT_STYLE)
        startYPosition += Y_MARGIN
        this.nextIncomeText = scene.add.text(LEFT_MARGIN, startYPosition, 'Next income: ', TEXT_STYLE)
        startYPosition += Y_MARGIN
        this.incomeText = scene.add.text(LEFT_MARGIN, startYPosition, 'Income: ', TEXT_STYLE)
        startYPosition += Y_MARGIN
        this.moneyText = scene.add.text(LEFT_MARGIN, startYPosition, 'Money: ', TEXT_STYLE)
        startYPosition += Y_MARGIN
        scene.add.text(LEFT_MARGIN, startYPosition, 'Players incomes: ', TEXT_STYLE)
        this.playerYPosition = startYPosition + Y_MARGIN
    }

    update(scene: BaseScene) {
        const state = scene.getState()
        const players = state?.players

        const currentPlayer = state?.currentPlayer
        if(currentPlayer) {
            if(!this.nameText.text.endsWith(currentPlayer?.name)) {
                this.nameText.text= `Name: ${currentPlayer.name}`
                this.nameText.setColor("#"+ currentPlayer.color.replace('0x', ''))
            }
            if(!this.incomeText.text.endsWith(`${currentPlayer?.income}`)) {
                this.incomeText.text= `Income: ${currentPlayer.income}`
            }
            if(!this.moneyText.text.endsWith(`${currentPlayer?.money}`)) {
                this.moneyText.text= `Money: ${currentPlayer.money}`
            }
        }

        this.nextIncomeText.text = `Next income: ${state?.nextIncome}s`

        players?.forEach(player => {
            const playerText = `- ${player.name}: ${player.income}`
            if(!this.playersTexts[player.name]){
                this.playersTexts[player.name] = scene.add.text(LEFT_MARGIN, this.playerYPosition, playerText, TEXT_STYLE)
                this.playersTexts[player.name].setColor("#" + player.color.replace("0x", ""))
                this.playerYPosition = this.playerYPosition + Y_MARGIN
            } else if(this.playersTexts[player.name].text !== playerText) {
                    this.playersTexts[player.name].text = playerText
            }
        })
    }

}
