import * as Phaser from 'phaser'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { BaseScene } from '../../scenes/BaseScene'

export abstract class Building extends Phaser.GameObjects.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number, texture: string | Phaser.Textures.Texture) {
        super(scene, x, y, texture, undefined)

        this.setInteractive()
        const input = this.input!
        input.hitArea.setSize(TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT)
        input.hitArea.setPosition(TILE_WIDTH_HEIGHT / 2, TILE_WIDTH_HEIGHT / 2)
        this.on(Phaser.Input.Events.POINTER_UP, this.onPress)
        this.off(Phaser.Input.Events.DESTROY, this.onPress)
    }

    onPress() {
        ;(this.scene as BaseScene).getUIScene().onBuildingSelected(this)
    }
}
