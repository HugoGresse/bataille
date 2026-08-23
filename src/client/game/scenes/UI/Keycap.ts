import * as Phaser from 'phaser'
import { crispText } from './crispText'

const PAD_X = 5
const HEIGHT = 15
const RADIUS = 3
const FACE = 0x0b1220
const EDGE = 0xffffff
const INK = '#ffffff'

/**
 * A key, worn on the control it fires. The whole trick is the 2px bottom edge: it collapses to
 * 1px and the cap drops a pixel while the key is down, including when the real keyboard key is
 * pressed. Never used as a standalone legend.
 */
export class Keycap {
    public readonly container: Phaser.GameObjects.Container
    private readonly face: Phaser.GameObjects.Graphics
    private readonly label: Phaser.GameObjects.Text
    private readonly width: number
    private pressed = false
    private enabled = true

    constructor(scene: Phaser.Scene, x: number, y: number, key: string) {
        this.face = scene.add.graphics()
        this.label = crispText(scene, 0, 0, key.toUpperCase(), {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '10px',
            color: INK,
        })
        this.label.setOrigin(0.5, 0.5)

        this.width = Math.max(16, this.label.width + PAD_X * 2)
        this.container = scene.add.container(x, y, [this.face, this.label])
        this.container.setSize(this.width, HEIGHT)
        this.draw()
    }

    setPressed(pressed: boolean) {
        if (this.pressed === pressed) {
            return
        }
        this.pressed = pressed
        this.draw()
    }

    setEnabled(enabled: boolean) {
        if (this.enabled === enabled) {
            return
        }
        this.enabled = enabled
        this.pressed = false
        this.draw()
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y)
    }

    destroy() {
        this.container.destroy()
    }

    private draw() {
        const w = this.width
        const h = HEIGHT
        const left = -w / 2
        const bottomEdge = this.pressed ? 1 : 2
        const drop = this.pressed ? 1 : 0
        const alpha = this.enabled ? 1 : 0.34

        this.face.clear()
        this.face.fillStyle(FACE, this.enabled ? 0.82 : 0.4)
        this.face.fillRoundedRect(left, -h / 2 + drop, w, h, RADIUS)
        this.face.lineStyle(1, EDGE, 0.3 * alpha)
        this.face.strokeRoundedRect(left, -h / 2 + drop, w, h, RADIUS)
        // the physical edge: a thicker line along the bottom only
        this.face.lineStyle(bottomEdge, EDGE, 0.34 * alpha)
        this.face.beginPath()
        this.face.moveTo(left + RADIUS, h / 2 + drop)
        this.face.lineTo(left + w - RADIUS, h / 2 + drop)
        this.face.strokePath()

        this.label.setY(drop)
        this.label.setAlpha(this.enabled ? 0.92 : 0.34)
    }
}
