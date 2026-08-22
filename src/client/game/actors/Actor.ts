import * as Phaser from 'phaser'
import { Physics, GameObjects } from 'phaser'
import { UnitState } from '../../../server/model/GameState'
import { TEXT_STYLE } from '../../utils/TEXT_STYLE'
import { UNIT_FONT_SIZE } from '../utils/setupCamera'

export class Actor extends Phaser.GameObjects.Sprite {
    protected hp = 0
    protected selectedCircle!: GameObjects.Arc | null
    private hpText: GameObjects.Text
    private hpFontSize: number = 20
    /**
     * Latest server-known position. Every state update refreshes it and the movement tween
     * chains hop after hop until the sprite caught up: dropping intermediate positions
     * (as done previously) made units visually lag behind server events like town captures.
     */
    private targetX: number | null = null
    private targetY: number | null = null

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
        this.hpText.setDepth(2)
        this.hpText.setOrigin(0.5, 0.5)
    }

    public update(refUnit?: UnitState) {
        if (this.selectedCircle) {
            this.selectedCircle.x = this.x
            this.selectedCircle.y = this.y
        }

        if ((refUnit && refUnit.hp !== this.hp) || this.hpFontSize !== UNIT_FONT_SIZE) {
            if (refUnit) {
                this.hp = refUnit.hp
            }
            this.hpText.text = this.hp.toString()
            this.hpFontSize = UNIT_FONT_SIZE
            this.hpText.setFontSize(UNIT_FONT_SIZE)
            if (UNIT_FONT_SIZE > 20) {
                this.hpText.setOrigin(0.5, -0.1)
            } else {
                this.hpText.setOrigin(0.5, 0.5)
            }
        }

        if (!refUnit) {
            return
        }

        this.targetX = refUnit.p.x
        this.targetY = refUnit.p.y
        this.startMovementTween()
    }

    /**
     * Tween toward the latest known server position. Slightly faster than the server tick
     * (100ms) so the sprite stays in sync with server-side events (fights, town captures).
     */
    private startMovementTween() {
        if (!this.scene || !this.active || this.scene.tweens.isTweening(this)) {
            return
        }
        if (this.targetX === null || this.targetY === null || (this.targetX === this.x && this.targetY === this.y)) {
            return
        }
        this.scene.tweens.add({
            targets: [this, this.hpText, this.selectedCircle],
            x: {
                from: this.x,
                to: this.targetX,
            },
            y: {
                from: this.y,
                to: this.targetY,
            },
            ease: 'Linear',
            duration: 90,
            onComplete: () => this.startMovementTween(), // target may have moved again meanwhile
        })
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
    public onSelect() {
        const centerX = this.x
        const centerY = this.y
        if (this.selectedCircle) {
            this.selectedCircle.destroy()
        }
        this.selectedCircle = this.scene.add.circle(centerX, centerY, this.input?.hitArea.height ?? 0, 0xffffff, 95)
        this.selectedCircle.setDepth(0)
    }

    public onUnselect() {
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
        const body = this.getBody()
        if (body.velocity.x < 0) {
            this.scaleX = -1
        } else {
            this.scaleX = 1
        }
    }

    protected getBody(): Physics.Arcade.Body {
        return this.body as Physics.Arcade.Body
    }
}
