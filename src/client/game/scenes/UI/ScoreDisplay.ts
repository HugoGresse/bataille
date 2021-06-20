import {BaseScene} from '../BaseScene'

const LEFT_MARGIN = 20
const Y_MARGIN = 16

const textStyle = {
    color: '#FFFFFF', fontFamily: 'sans-serif',
}

export class ScoreDisplay {

    colorText: Phaser.GameObjects.Text
    incomeText: Phaser.GameObjects.Text
    nameText: Phaser.GameObjects.Text
    playersTexts: {
        [playerId: string]: Phaser.GameObjects.Text
    } = {}
    playerYPosition: number

    constructor(scene: Phaser.Scene) {
        let startYPosition = 10
        const rectangle = scene.add.rectangle(0, 0, 350, 400)
        rectangle.setFillStyle(0x000000, 0.5)
        this.nameText = scene.add.text(LEFT_MARGIN, startYPosition, 'Name: ', textStyle)
        startYPosition += Y_MARGIN
        this.colorText = scene.add.text(LEFT_MARGIN, startYPosition, 'Color:', textStyle)
        startYPosition += Y_MARGIN
        this.incomeText = scene.add.text(LEFT_MARGIN, startYPosition, 'Income: ', textStyle)
        startYPosition += Y_MARGIN
        scene.add.text(LEFT_MARGIN, startYPosition, 'Players incomes: ', textStyle)
        this.playerYPosition = startYPosition + Y_MARGIN
    }

    update(scene: BaseScene) {
        const players = scene.getState()?.players

        players?.forEach(player => {
            const playerText = `- ${player.name}: ${player.income}`
            if(!this.playersTexts[player.name]){
                this.playersTexts[player.name] = scene.add.text(LEFT_MARGIN, this.playerYPosition, playerText, textStyle)
                this.playerYPosition = this.playerYPosition + Y_MARGIN
            } else if(this.playersTexts[player.name].text !== playerText) {
                    this.playersTexts[player.name].text = playerText
            }
        })
    }

}
