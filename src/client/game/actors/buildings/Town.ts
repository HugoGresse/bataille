import {Building} from './Building'
import {UIPlayer} from '../UIPlayer'
import {BUILDING_TOWN} from '../../../../common/UNITS'
import { GameObjects, Display } from 'phaser'

export class Town extends Building {
    private playerRectangle: GameObjects.Rectangle

    constructor(scene: Phaser.Scene, x: number, y: number, public player: UIPlayer) {
        super(scene, x, y, BUILDING_TOWN)

        this.playerRectangle = this.scene.add.rectangle(this.x , this.y , 32, 32);
        this.playerRectangle.setStrokeStyle(3, Display.Color.HexStringToColor(player.color).color)
    }
}
