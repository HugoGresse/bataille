import { Physics, GameObjects } from 'phaser'
import { UnitState } from '../../../server/model/GameState'
import { TEXT_STYLE } from '../../utils/TEXT_STYLE'

export class Actor extends Phaser.GameObjects.Sprite {
    protected hp = 0
    protected selectedCircle!: GameObjects.Arc | null
    private hpText: GameObjects.Text

    constructor(
        scene: Phaser.Scene,
        public readonly id: string,
        x: number,
        y: number,
        texture: string,
        frame?: string | number
    ) {
        super(scene, x, y, texture, frame)

        scene.add.existing(this)
        this.hpText = scene.add.text(x, y, '', {
            ...TEXT_STYLE,
        })
        this.hpText.setStroke('#000000', 1)
    }

    public update(refUnit: UnitState) {
        if (this.selectedCircle) {
            this.selectedCircle.x = this.x
            this.selectedCircle.y = this.y
        }

        if (refUnit.hp.current !== this.hp) {
            this.hp = refUnit.hp.current
            this.hpText.text = this.hp.toString()
        }
        if (this.hp > 9) {
            this.hpText.x = this.x - 11
        } else {
            this.hpText.x = this.x - 5
        }
        this.hpText.y = this.y - 9
    }

    public setColor(color: string) {
        this.hpText.setColor(color)
    }

    public destroy() {
        super.destroy()
        this?.selectedCircle?.destroy()
        this.hpText.destroy()
    }

    // When unit is selected, emphasis the actor
    protected onSelect() {
        const centerX = this.x
        const centerY = this.y
        if (this.selectedCircle) {
            this.selectedCircle.destroy()
        }
        this.selectedCircle = this.scene.add.circle(centerX, centerY, this.input.hitArea.height, 0xffffffff, 0)
        this.selectedCircle.setDepth(0)
    }

    protected onUnselect() {
        if (this.selectedCircle) {
            this.selectedCircle.destroy()
            this.selectedCircle = null
        }
    }

    public getDamage(value?: number): void {
        this.scene.tweens.add({
            targets: this,
            duration: 100,
            repeat: 3,
            yoyo: true,
            alpha: 0.5,
            onStart: () => {
                if (value) {
                    this.hp = this.hp - value
                }
            },
            onComplete: () => {
                this.setAlpha(1)
            },
        })
    }

    public getHPValue(): number {
        return this.hp
    }

    protected checkFlip(): void {
        if (this.body.velocity.x < 0) {
            this.scaleX = -1
        } else {
            this.scaleX = 1
        }
    }

    protected getBody(): Physics.Arcade.Body {
        return this.body as Physics.Arcade.Body
    }
}
