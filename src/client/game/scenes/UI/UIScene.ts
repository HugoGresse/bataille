import 'phaser'
import {BaseScene} from '../BaseScene'
import {ScoreDisplay} from './ScoreDisplay'

export class UIScene extends BaseScene {

    scoreDisplay !: ScoreDisplay

    constructor() {
        super('UI')
    }

    create() {
        this.scoreDisplay = new ScoreDisplay(this)
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        this.scoreDisplay.update(this)
    }

}
