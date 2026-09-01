import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { RENDER_SCALE } from '../../utils/renderScale'
import { crispText } from './crispText'
import { lossLabel, placeMarker, shouldMerge } from './lossMarkerGeometry'

const LIFETIME_MS = 6000
const FADE_MS = 900
const MAX_MARKERS = 5
const EDGE_MARGIN = 34
const ARROW_SIZE = 9
const HIT_RADIUS = 26

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
}

/**
 * A town of yours changing hands used to be a sound and nothing else, and the ripple it draws on
 * the board is invisible whenever you are looking somewhere else - which is most of the time.
 *
 * Each loss puts an arrow at the true bearing of the town: on the town while it is in view, on the
 * viewport edge along that same line once it is not, so the direction stays readable rather than
 * being snapped to the nearest side. The label carries the name and what the loss costs per turn.
 * Clicking a marker takes the camera there.
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
            const alpha = age > LIFETIME_MS - FADE_MS ? (LIFETIME_MS - age) / FADE_MS : 1

            marker.arrow.setPosition(placement.position.x, placement.position.y)
            marker.arrow.setRotation(Phaser.Math.DEG_TO_RAD * placement.angle)
            marker.arrow.setAlpha(alpha)
            marker.arrow.setVisible(!placement.onScreen)
            marker.zone.setPosition(placement.position.x, placement.position.y)

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

        const marker: Marker = { loss, arrow, label, plate, zone, bornAt, angle, mergedCount: 0 }
        this.paint(marker)
        return marker
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
        marker.arrow.destroy()
        marker.label.destroy()
        marker.plate.destroy()
        marker.zone.destroy()
        this.markers = this.markers.filter((candidate) => candidate !== marker)
    }
}
