import * as Phaser from 'phaser'
import { UnitState } from '../../../server/model/GameState'
import { toColorNumber } from '../utils/colors'
import { RENDER_SCALE } from '../utils/renderScale'

/** Stack size thresholds: a scout, a working force, an army worth fearing */
const SIZE_STEPS = [
    { upTo: 5, radius: 13, font: 11 },
    { upTo: 20, radius: 16.5, font: 13 },
    { upTo: Infinity, radius: 20.5, font: 15 },
]

const INK = '#17120a'
const RIM = 0xffffff
const SHADOW = 0x000000
const HURT = 0xff5252

const TWEEN_MS = 90
const HURT_MS = 400
const LIFT_SCALE = 1.1
const LIFT_Y = -3

/**
 * A stack drawn as an enamel counter sitting on the board rather than a sprite drawn into it:
 * player-colour fill, dark ink number, white rim, and the highlight/shade pair that reads as a
 * bevel. Size carries the stack size before you read the digits.
 */
export class Actor extends Phaser.GameObjects.Container {
    protected hp = 0
    private ownerColor = 0xffffff
    private radius = SIZE_STEPS[0].radius

    private readonly shadow: Phaser.GameObjects.Ellipse
    private readonly disc: Phaser.GameObjects.Arc
    private readonly bevel: Phaser.GameObjects.Graphics
    private readonly label: Phaser.GameObjects.Text
    private selectionRing: Phaser.GameObjects.Arc | null = null
    private hurtTween: Phaser.Tweens.Tween | null = null
    private moveTween: Phaser.Tweens.Tween | null = null
    private liftTween: Phaser.Tweens.Tween | null = null
    /** Scale is the product of two independent factors, so neither tween clobbers the other */
    private zoomScale = 1
    private liftScale = 1

    /**
     * Latest server-known position. Every state update refreshes it and the movement tween chains
     * hop after hop until the piece caught up.
     */
    private targetX: number | null = null
    private targetY: number | null = null

    constructor(
        scene: Phaser.Scene,
        public readonly id: string,
        x: number,
        y: number
    ) {
        super(scene, x, y)

        this.shadow = scene.add.ellipse(0, 5, this.radius * 1.9, this.radius * 0.9, SHADOW, 0.45)
        this.disc = scene.add.circle(0, 0, this.radius, 0xffffff)
        this.disc.setStrokeStyle(2, RIM, 0.55)
        this.bevel = scene.add.graphics()
        this.label = scene.add.text(0, 0, '', {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontStyle: 'bold',
            fontSize: '11px',
            color: INK,
            resolution: RENDER_SCALE,
        })
        this.label.setOrigin(0.5, 0.5)

        this.add([this.shadow, this.disc, this.bevel, this.label])
        scene.add.existing(this)
        this.applySize(this.radius, SIZE_STEPS[0].font)
    }

    public update(refUnit?: UnitState) {
        if (refUnit) {
            if (refUnit.hp !== this.hp) {
                const lost = this.hp > 0 && refUnit.hp < this.hp
                this.hp = refUnit.hp
                this.redrawForHp()
                if (lost) {
                    this.playHurt()
                }
            }
            this.targetX = refUnit.p.x
            this.targetY = refUnit.p.y
            this.startMovementTween()
        }
    }

    /**
     * Pieces are world objects, so they shrink with the camera. Below the point where the number
     * stops being readable they get scaled back up rather than vanishing.
     */
    public applyZoom(zoom: number) {
        this.zoomScale = zoom < 0.6 ? Math.min(1.8, 0.6 / zoom) : 1
        this.applyScale()
    }

    private applyScale() {
        this.setScale(this.zoomScale * this.liftScale)
    }

    public setColor(color: string) {
        this.ownerColor = toColorNumber(color)
        this.disc.setFillStyle(this.ownerColor)
        this.redrawBevel()
    }

    public getColorNumber(): number {
        return this.ownerColor
    }

    public destroy(fromScene?: boolean) {
        this.hurtTween?.stop()
        this.selectionRing?.destroy()
        super.destroy(fromScene)
    }

    /** Lift the piece off the board, the way you would pinch a counter off a table */
    public onSelect() {
        if (this.selectionRing) {
            return
        }
        this.selectionRing = this.scene.add.circle(0, 0, this.radius + 3.5)
        this.selectionRing.setStrokeStyle(3, RIM, 0.85)
        this.addAt(this.selectionRing, 2)
        this.shadow.setAlpha(0.6)
        this.shadow.setScale(1.15)
        this.tweenLift(LIFT_SCALE, 110, 'Back.easeOut')
        this.disc.setY(LIFT_Y)
        this.bevel.setY(LIFT_Y)
        this.label.setY(LIFT_Y)
        this.selectionRing.setY(LIFT_Y)
    }

    public onUnselect() {
        if (!this.selectionRing) {
            return
        }
        this.selectionRing.destroy()
        this.selectionRing = null
        this.shadow.setAlpha(0.45)
        this.shadow.setScale(1)
        this.tweenLift(1, 90, 'Linear')
        this.disc.setY(0)
        this.bevel.setY(0)
        this.label.setY(0)
    }

    private tweenLift(to: number, duration: number, ease: string) {
        this.liftTween?.stop()
        this.liftTween = this.scene.tweens.addCounter({
            from: this.liftScale,
            to,
            duration,
            ease,
            onUpdate: (tween) => {
                this.liftScale = tween.getValue() ?? to
                this.applyScale()
            },
            onComplete: () => {
                this.liftScale = to
                this.applyScale()
                this.liftTween = null
            },
        })
    }

    public getHPValue(): number {
        return this.hp
    }

    /** Latest position received from the server (the piece may still be tweening toward it) */
    public getServerPosition(): { x: number; y: number } {
        return { x: this.targetX ?? this.x, y: this.targetY ?? this.y }
    }

    private redrawForHp() {
        this.label.setText(this.hp.toString())
        const step = SIZE_STEPS.find((s) => this.hp <= s.upTo) ?? SIZE_STEPS[SIZE_STEPS.length - 1]
        if (step.radius !== this.radius) {
            this.applySize(step.radius, step.font)
        }
    }

    private applySize(radius: number, fontSize: number) {
        this.radius = radius
        this.disc.setRadius(radius)
        this.shadow.setSize(radius * 1.9, radius * 0.9)
        this.label.setFontSize(fontSize)
        this.selectionRing?.setRadius(radius + 3.5)
        // Deliberately not setSize(): the container size drives the input hit area, which StickUnit
        // owns and keeps at a full tile whatever the stack grows to.
        this.redrawBevel()
    }

    /** Inset highlight on top, inset shade at the bottom: the pair is what reads as a bevel */
    private redrawBevel() {
        const inner = this.radius - 2.4
        this.bevel.clear()
        this.bevel.lineStyle(2.4, RIM, 0.4)
        this.bevel.beginPath()
        this.bevel.arc(0, 0, inner, Phaser.Math.DEG_TO_RAD * 200, Phaser.Math.DEG_TO_RAD * 340)
        this.bevel.strokePath()
        this.bevel.lineStyle(2.4, SHADOW, 0.22)
        this.bevel.beginPath()
        this.bevel.arc(0, 0, inner, Phaser.Math.DEG_TO_RAD * 20, Phaser.Math.DEG_TO_RAD * 160)
        this.bevel.strokePath()
    }

    /** Losses flash the rim red and desaturate, rather than shaking the piece */
    private playHurt() {
        this.hurtTween?.stop()
        this.disc.setStrokeStyle(2.5, HURT, 0.95)
        this.hurtTween = this.scene.tweens.add({
            targets: this.disc,
            alpha: { from: 1, to: 0.55 },
            yoyo: true,
            repeat: 1,
            duration: HURT_MS / 4,
            onComplete: () => {
                this.disc.setAlpha(1)
                this.disc.setStrokeStyle(2, RIM, 0.55)
                this.hurtTween = null
            },
        })
    }

    /**
     * Tween toward the latest known server position, slightly faster than the server tick so the
     * piece stays in sync with server-side events (fights, town captures).
     */
    private startMovementTween() {
        if (!this.scene || !this.active || this.moveTween) {
            return
        }
        if (this.targetX === null || this.targetY === null || (this.targetX === this.x && this.targetY === this.y)) {
            return
        }
        this.moveTween = this.scene.tweens.add({
            targets: this,
            x: { from: this.x, to: this.targetX },
            y: { from: this.y, to: this.targetY },
            ease: 'Linear',
            duration: TWEEN_MS,
            onComplete: () => {
                this.moveTween = null
                this.startMovementTween() // the target may have moved again meanwhile
            },
        })
    }
}
