import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { RENDER_SCALE } from '../../utils/renderScale'
import { crispText } from './crispText'
import { lossLabel, markerOpacity, placeMarker, shouldMerge } from './lossMarkerGeometry'

const LIFETIME_MS = 9000
const FADE_MS = 1200
const MAX_MARKERS = 5
const EDGE_MARGIN = 34
const ARROW_SIZE = 9
const HIT_RADIUS = 26

/** The arrow arrives oversized and settles, the way a thrown thing lands */
const POP_FROM = 2.1
const POP_MS = 420
/** Then it breathes, slowly enough to read as alive rather than as a blinking alert */
const PULSE_TO = 1.22
const PULSE_MS = 900

export type TownLoss = {
    tileX: number
    tileY: number
    townName: string
    /** Income the loss cost this turn: 0 when the country was already broken */
    incomeLost: number
    /** The capturing player's colour, so the arrow matches their standings swatch */
    color: number
}

type Marker = {
    loss: TownLoss
    arrow: Phaser.GameObjects.Triangle
    label: Phaser.GameObjects.Text
    plate: Phaser.GameObjects.Rectangle
    zone: Phaser.GameObjects.Zone
    bornAt: number
    angle: number
    mergedCount: number
    tweens: Phaser.Tweens.Tween[]
    /** 0 while the marker is still arriving: multiplied into the fade so neither owns alpha alone */
    entryAlpha: number
}

/**
 * A town of yours changing hands used to be a sound and nothing else, and the ripple it draws on
 * the board is invisible whenever you are looking somewhere else - which is most of the time.
 *
 * Each loss puts an arrow at the true bearing of the town: on the town while it is in view, on the
 * viewport edge along that same line once it is not, so the direction stays readable rather than
 * being snapped to the nearest side. The label carries the name and what the loss costs per turn.
 * Clicking an edge marker takes the camera there. On the town itself the marker takes no clicks:
 * the town is right there, and the click is the order sending a stack to retake it.
 */
export class LossMarkers {
    private markers: Marker[] = []

    constructor(private scene: UIScene) {}

    add(loss: TownLoss) {
        const now = this.scene.time.now
        const { width, height } = getGameWindowSize(this.scene)
        const placement = placeMarker(this.toScreen(loss), width, height, EDGE_MARGIN)

        const mergeInto = this.markers.find((marker) =>
            shouldMerge({ angle: marker.angle, at: marker.bornAt }, { angle: placement.angle, at: now })
        )
        if (mergeInto) {
            mergeInto.mergedCount += 1
            mergeInto.loss = loss
            mergeInto.bornAt = now
            this.paint(mergeInto)
            this.playEntry(mergeInto) // another town gone the same way deserves the same jolt
            return
        }

        while (this.markers.length >= MAX_MARKERS) {
            this.remove(this.markers[0])
        }
        this.markers.push(this.build(loss, placement.angle, now))
    }

    /** Markers are anchored to the world, so they slide as the camera moves */
    update() {
        if (!this.markers.length) {
            return
        }
        const now = this.scene.time.now
        const { width, height } = getGameWindowSize(this.scene)

        for (const marker of [...this.markers]) {
            const age = now - marker.bornAt
            if (age > LIFETIME_MS) {
                this.remove(marker)
                continue
            }
            const placement = placeMarker(this.toScreen(marker.loss), width, height, EDGE_MARGIN)
            marker.angle = placement.angle
            const alpha = markerOpacity(age, LIFETIME_MS, FADE_MS) * marker.entryAlpha

            marker.arrow.setPosition(placement.position.x, placement.position.y)
            marker.arrow.setRotation(Phaser.Math.DEG_TO_RAD * placement.angle)
            marker.arrow.setAlpha(alpha)
            marker.arrow.setVisible(!placement.onScreen)
            marker.zone.setPosition(placement.position.x, placement.position.y)
            this.setClickable(marker, !placement.onScreen)

            // Keep the label inside the view: past the middle of the screen it flips to the other side
            const labelOffset = placement.position.x > width / 2 ? -1 : 1
            const labelX = placement.position.x + labelOffset * (ARROW_SIZE + 6 + marker.label.width / 2)
            marker.label.setPosition(Math.round(labelX), Math.round(placement.position.y))
            marker.label.setAlpha(alpha)
            marker.plate.setPosition(marker.label.x, marker.label.y)
            marker.plate.setSize(marker.label.width + 10, marker.label.height + 6)
            marker.plate.setAlpha(alpha * 0.85)
        }
    }

    destroy() {
        ;[...this.markers].forEach((marker) => this.remove(marker))
    }

    private build(loss: TownLoss, angle: number, bornAt: number): Marker {
        const plate = this.scene.add.rectangle(0, 0, 10, 10, 0x060a12, 0.85)
        plate.setStrokeStyle(1, loss.color, 0.5)
        const label = crispText(this.scene, 0, 0, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            color: '#ffffff',
        })
        label.setOrigin(0.5, 0.5)

        const arrow = this.scene.add.triangle(0, 0, 0, -ARROW_SIZE, ARROW_SIZE * 1.6, 0, 0, ARROW_SIZE, loss.color)
        arrow.setStrokeStyle(1, 0xffffff, 0.65)

        const zone = this.scene.add.zone(0, 0, HIT_RADIUS * 2, HIT_RADIUS * 2)
        zone.setInteractive({ useHandCursor: true })
        zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) =>
            this.scene.markUIPointer(pointer)
        )
        zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.panTo(loss))

        const marker: Marker = {
            loss,
            arrow,
            label,
            plate,
            zone,
            bornAt,
            angle,
            mergedCount: 0,
            tweens: [],
            entryAlpha: 0,
        }
        this.setClickable(marker, false) // placed, and made clickable if it belongs on the edge, by the next update
        this.paint(marker)
        this.playEntry(marker)
        return marker
    }

    /**
     * The hit zone follows the marker, but only the edge arrow is a button. While the town is in
     * view the zone sits right on it, and a zone that ate the pointer there would eat the move
     * order onto the town too, which is the first thing to do about losing it.
     */
    private setClickable(marker: Marker, clickable: boolean) {
        if (marker.zone.input) {
            marker.zone.input.enabled = clickable
        }
    }

    /**
     * The arrow drops in oversized and settles, then keeps breathing for as long as it is up. The
     * movement is what catches the eye when it appears at the edge of your attention; the pulse is
     * what keeps it findable afterwards without flashing.
     */
    private playEntry(marker: Marker) {
        marker.tweens.forEach((tween) => tween.stop())
        marker.tweens = []
        marker.arrow.setScale(POP_FROM)

        marker.tweens.push(
            this.scene.tweens.addCounter({
                from: marker.entryAlpha,
                to: 1,
                duration: POP_MS,
                onUpdate: (tween) => {
                    marker.entryAlpha = tween.getValue() ?? 1
                },
                onComplete: () => {
                    marker.entryAlpha = 1
                },
            })
        )
        marker.tweens.push(
            this.scene.tweens.add({
                targets: marker.arrow,
                scale: 1,
                duration: POP_MS,
                ease: 'Back.easeOut',
                onComplete: () => {
                    marker.tweens.push(
                        this.scene.tweens.add({
                            targets: marker.arrow,
                            scale: PULSE_TO,
                            duration: PULSE_MS,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut',
                        })
                    )
                },
            })
        )
    }

    private paint(marker: Marker) {
        marker.label.setText(lossLabel(marker.loss.townName, marker.loss.incomeLost, marker.mergedCount))
        marker.arrow.setFillStyle(marker.loss.color)
        marker.plate.setStrokeStyle(1, marker.loss.color, 0.5)
    }

    private panTo(loss: TownLoss) {
        const camera = this.scene.getBatailleScene()?.cameras?.main
        camera?.pan(
            loss.tileX * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2,
            loss.tileY * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2,
            320,
            'Quad.easeOut'
        )
    }

    /** The HUD lays out in CSS pixels, the board in world ones */
    private toScreen(loss: { tileX: number; tileY: number }): { x: number; y: number } {
        const camera = this.scene.getBatailleScene()?.cameras?.main
        const worldX = loss.tileX * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        const worldY = loss.tileY * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        if (!camera) {
            return { x: worldX, y: worldY }
        }
        return {
            x: ((worldX - camera.worldView.x) * camera.zoom) / RENDER_SCALE,
            y: ((worldY - camera.worldView.y) * camera.zoom) / RENDER_SCALE,
        }
    }

    private remove(marker: Marker) {
        marker.tweens.forEach((tween) => tween.stop())
        marker.arrow.destroy()
        marker.label.destroy()
        marker.plate.destroy()
        marker.zone.destroy()
        this.markers = this.markers.filter((candidate) => candidate !== marker)
    }
}
