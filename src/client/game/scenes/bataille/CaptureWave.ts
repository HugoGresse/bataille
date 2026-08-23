import * as Phaser from 'phaser'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { DEPTH_WAVE } from '../depth'
import { sampleWave } from '../../utils/waveCurve'
import { devicePx } from '../../utils/renderScale'

/** Screen-space geometry, so a ripple looks the same zoomed in or out */
const BASE_RADIUS = 31
const RINGS = [
    { delay: 0, duration: 1150 },
    { delay: 190, duration: 1150 },
]

const FLASH_MS = 620
const MAX_CONCURRENT = 6
const DEDUPE_MS = 500

type Ripple = { graphics: Phaser.GameObjects.Graphics; tweens: Phaser.Tweens.Tween[] }

/**
 * Every town capture ripples out of the town in the capturing player's colour. It answers "where"
 * from the corner of your eye and costs no screen space, so a dozen captures in the early game
 * read as weather across the map instead of a wall of text.
 */
export class CaptureWave {
    private live: Ripple[] = []
    private lastAt = new Map<string, number>()

    constructor(private scene: Phaser.Scene) {}

    /**
     * @param tileX,tileY the captured tile
     * @param color the capturing player's colour
     */
    play(tileX: number, tileY: number, color: number) {
        const key = `${tileX},${tileY}`
        const now = this.scene.time.now
        if (now - (this.lastAt.get(key) ?? -Infinity) < DEDUPE_MS) {
            return // the same tile twice in a blink is one ripple, not two
        }
        this.lastAt.set(key, now)

        const x = tileX * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        const y = tileY * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        if (!this.isVisible(x, y)) {
            return // no work for ripples nobody can see
        }

        while (this.live.length >= MAX_CONCURRENT) {
            this.stop(this.live[0])
        }

        const zoom = this.scene.cameras.main.zoom || 1
        const worldRadius = devicePx(BASE_RADIUS) / zoom
        const graphics = this.scene.add.graphics()
        graphics.setDepth(DEPTH_WAVE)
        const ripple: Ripple = { graphics, tweens: [] }
        this.live.push(ripple)

        const rings = RINGS.map(() => ({ scale: 0, alpha: 0, width: 0, on: false }))
        const redraw = () => {
            graphics.clear()
            rings.forEach((ring) => {
                if (!ring.on || ring.alpha <= 0) {
                    return
                }
                graphics.lineStyle(devicePx(ring.width) / zoom, color, ring.alpha)
                graphics.strokeCircle(x, y, worldRadius * ring.scale)
            })
        }

        RINGS.forEach((config, index) => {
            const tween = this.scene.tweens.addCounter({
                from: 0,
                to: 1,
                duration: config.duration,
                delay: config.delay,
                onStart: () => {
                    rings[index].on = true
                },
                onUpdate: (t) => {
                    Object.assign(rings[index], sampleWave(t.getValue() ?? 0))
                    redraw()
                },
                onComplete: () => {
                    rings[index].on = false
                    redraw()
                    if (index === RINGS.length - 1) {
                        this.stop(ripple)
                    }
                },
            })
            ripple.tweens.push(tween)
        })

        this.flashTile(x, y, color)
    }

    destroy() {
        ;[...this.live].forEach((ripple) => this.stop(ripple))
        this.lastAt.clear()
    }

    private flashTile(x: number, y: number, color: number) {
        const flash = this.scene.add.rectangle(x, y, TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT, color, 0.75)
        flash.setDepth(DEPTH_WAVE)
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: FLASH_MS,
            ease: 'Quad.easeOut',
            onComplete: () => flash.destroy(),
        })
    }

    private isVisible(x: number, y: number): boolean {
        const view = this.scene.cameras.main.worldView
        const margin = TILE_WIDTH_HEIGHT * 4
        return x > view.x - margin && x < view.right + margin && y > view.y - margin && y < view.bottom + margin
    }

    private stop(ripple: Ripple) {
        ripple.tweens.forEach((tween) => tween.stop())
        ripple.graphics.destroy()
        this.live = this.live.filter((r) => r !== ripple)
    }
}
