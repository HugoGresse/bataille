import {Building} from './Building'
import {UIPlayer} from '../UIPlayer'
import {BUILDING_TOWN, TILE_WIDTH_HEIGHT} from '../../../../common/UNITS'
import { GameObjects, Display } from 'phaser'

export class Town extends Building {
    private playerRectangle: GameObjects.Rectangle

    constructor(scene: Phaser.Scene, x: number, y: number, public player: UIPlayer) {
        super(scene, x, y, BUILDING_TOWN)

        this.playerRectangle = this.scene.add.rectangle(this.x +TILE_WIDTH_HEIGHT/2, this.y+TILE_WIDTH_HEIGHT/2 , TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT);
        this.playerRectangle.setStrokeStyle(3, Display.Color.HexStringToColor(player.color || "#000000").color)
    }
}
