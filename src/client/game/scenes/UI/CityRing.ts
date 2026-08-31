import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { Keycap } from './Keycap'
import { TILE_WIDTH_HEIGHT, UnitsType } from '../../../../common/UNITS'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { ensureRingTextures, PLATE_TEXTURE, SAT_OFF_TEXTURE, SAT_TEXTURE } from './ringTextures'
import { MUSTER_OPTIONS, MusterOption, musterCount } from '../../utils/muster'
import { RENDER_SCALE } from '../../utils/renderScale'
import { crispText } from './crispText'

/** Screen-space geometry: the ring is the same size at every zoom level */
const ARC_RADIUS = 92
const SAT_RADIUS = 25
const PLATE_RADIUS = 66
/** Pad in the satellite texture that carries its rim highlight */
const SAT_TEXTURE_PAD = 3

const HOVER_SCALE = 1.07
const PRESS_SCALE = 0.93

/** The ring fans out of the city rather than appearing on top of it */
const PLATE_IN_MS = 200
const SPREAD_MS = 300
/** Head start each satellite gives the next one, as a fraction of the spread */
const SPREAD_STAGGER = 0.12

/** Angles are measured from straight up, fanning left to right */
const ANGLES = [-52, 0, 52]

type Satellite = {
    option: MusterOption
    container: Phaser.GameObjects.Container
    face: Phaser.GameObjects.Image
    label: Phaser.GameObjects.Text
    cost: Phaser.GameObjects.Text
    cap: Keycap
    affordable: boolean
    hovered: boolean
}

/**
 * The muster options, worn by the city. Click your own town and they fan out around it: three
 * plain click targets with their cost and their key on the face. No drag, no dial.
 */
export class CityRing {
    private root: Phaser.GameObjects.Container | null = null
    private plate: Phaser.GameObjects.Image | null = null
    private title: Phaser.GameObjects.Text | null = null
    private hint: Phaser.GameObjects.Text | null = null
    private satellites: Satellite[] = []
    private town: { tileX: number; tileY: number; name?: string } | null = null
    /** Layout only changes when the ring flips or the treasury moves, the anchor moves every frame */
    private direction = 0
    private lastMoney = -1
    /** 0 while the satellites are still stacked on the city, 1 once they have reached the arc */
    private spread = 1
    private spreadTween: Phaser.Tweens.Tween | null = null

    constructor(private scene: UIScene) {}

    isOpen(): boolean {
        return !!this.root
    }

    getTown() {
        return this.town
    }

    open(tileX: number, tileY: number, townName?: string) {
        if (this.town && this.town.tileX === tileX && this.town.tileY === tileY) {
            return // already open on this city: rebuilding it would drop the hover and press states
        }
        this.close()
        this.town = { tileX, tileY, name: townName }

        this.direction = 0
        this.lastMoney = -1
        ensureRingTextures(this.scene, PLATE_RADIUS, SAT_RADIUS)

        this.root = this.scene.add.container(0, 0)
        // Clear in the middle so the selected counter reads through it untouched, then a soft
        // vignette that fades out before its edge shows.
        this.plate = this.scene.add.image(0, 0, PLATE_TEXTURE)
        this.plate.setDisplaySize(PLATE_RADIUS * 2, PLATE_RADIUS * 2)
        this.root.add(this.plate)

        this.title = crispText(this.scene, 0, 0, (townName ?? 'Town').toUpperCase(), {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '10px',
            color: '#ffffff',
        })
        this.title.setOrigin(0.5, 0.5)
        this.title.setAlpha(0.78)
        this.title.setBackgroundColor('#080d18')
        this.title.setPadding(6, 3, 6, 3)
        this.root.add(this.title)

        this.hint = crispText(this.scene, 0, 0, 'Esc to close', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '9px',
            color: '#ffffff',
        })
        this.hint.setOrigin(0.5, 0.5)
        this.hint.setAlpha(0.55)
        this.root.add(this.hint)

        MUSTER_OPTIONS.forEach((option, index) => {
            this.satellites.push(this.buildSatellite(option, index))
        })

        this.refresh()
        this.playOpenAnimation()
    }

    /** The plate blooms out of the city and the satellites fan off it, one just behind the next */
    private playOpenAnimation() {
        this.spreadTween?.stop()
        this.spread = 0
        this.layoutSatellites(this.direction)

        this.plate?.setScale(0.68)
        this.plate?.setAlpha(0)
        this.title?.setAlpha(0)
        this.hint?.setAlpha(0)
        this.scene.tweens.add({
            targets: this.plate,
            scale: 1,
            alpha: 1,
            duration: PLATE_IN_MS,
            ease: 'Cubic.easeOut',
        })
        this.scene.tweens.add({
            targets: [this.title, this.hint].filter(Boolean),
            alpha: { from: 0, to: 0.78 },
            duration: PLATE_IN_MS,
            delay: 70,
            ease: 'Cubic.easeOut',
        })

        this.spreadTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: SPREAD_MS,
            ease: 'Back.easeOut',
            onUpdate: (tween) => {
                this.spread = tween.getValue() ?? 1
                this.layoutSatellites(this.direction)
            },
            onComplete: () => {
                this.spread = 1
                this.spreadTween = null
                this.layoutSatellites(this.direction)
            },
        })
    }

    close() {
        this.spreadTween?.stop()
        this.spreadTween = null
        this.spread = 1
        this.satellites.forEach((sat) => sat.cap.destroy())
        this.satellites = []
        this.root?.destroy(true)
        this.root = null
        this.plate = null
        this.title = null
        this.hint = null
        this.town = null
    }

    /** Fire the option bound to this key, if the ring is open and the option is affordable */
    pressKey(key: string): boolean {
        const sat = this.satellites.find((s) => s.option.key === key.toUpperCase())
        if (!sat || !sat.affordable) {
            return false
        }
        sat.cap.setPressed(true)
        this.scene.time.delayedCall(110, () => sat.cap.setPressed(false))
        this.buy(sat.option)
        return true
    }

    /** Follow the camera: the ring is anchored to the city, not to the screen */
    update() {
        if (!this.root || !this.town) {
            return
        }
        this.refresh()
    }

    private buildSatellite(option: MusterOption, index: number): Satellite {
        const faceSize = (SAT_RADIUS + SAT_TEXTURE_PAD) * 2
        const face = this.scene.add.image(0, 0, SAT_TEXTURE)
        face.setDisplaySize(faceSize, faceSize)

        const label = crispText(this.scene, 0, -6, option.label, {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontStyle: 'bold',
            fontSize: '13px',
            color: '#ffffff',
        })
        label.setOrigin(0.5, 0.5)

        const cost = crispText(this.scene, 0, 8, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '8px',
            color: '#ffffff',
        })
        cost.setOrigin(0.5, 0.5)
        cost.setAlpha(0.78)

        const container = this.scene.add.container(0, 0, [face, label, cost])
        container.setSize(SAT_RADIUS * 2, SAT_RADIUS * 2)
        // Hit areas on a Container are measured from the top-left of its size box: Phaser adds
        // displayOrigin (half the size) to the local point before testing.
        container.setInteractive(
            new Phaser.Geom.Circle(SAT_RADIUS, SAT_RADIUS, SAT_RADIUS),
            Phaser.Geom.Circle.Contains
        )
        if (container.input) {
            container.input.cursor = 'pointer'
        }
        container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.setHovered(index, true))
        container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setHovered(index, false))
        container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            this.scene.markUIPointer(pointer)
            this.setPressed(index, true)
        })
        container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
            const sat = this.satellites[index]
            this.setPressed(index, false)
            if (sat?.affordable) {
                this.buy(option)
            }
        })

        const cap = new Keycap(this.scene, 0, 0, option.key)
        this.root?.add([container, cap.container])

        return { option, container, face, label, cost, cap, affordable: false, hovered: false }
    }

    /** The cursor is over a satellite: lift it and let its key stand proud */
    private setHovered(index: number, hovered: boolean) {
        const sat = this.satellites[index]
        if (!sat || !sat.affordable) {
            return
        }
        sat.hovered = hovered
        sat.container.setScale(hovered ? HOVER_SCALE : 1)
    }

    /** The satellite is being pressed: it sinks, and so does its key */
    private setPressed(index: number, pressed: boolean) {
        const sat = this.satellites[index]
        if (!sat || !sat.affordable) {
            return
        }
        sat.container.setScale(pressed ? PRESS_SCALE : sat.hovered ? HOVER_SCALE : 1)
        sat.cap.setPressed(pressed)
    }

    private buy(option: MusterOption) {
        if (!this.town) {
            return
        }
        const money = this.scene.getState()?.cp.m ?? 0
        const count = musterCount(option, money)
        if (count < 1) {
            return
        }
        // The server clamps to what the treasury actually covers
        this.scene.actions.newUnit(this.town.tileX * TILE_WIDTH_HEIGHT, this.town.tileY * TILE_WIDTH_HEIGHT, count)
        // Whatever is standing on the town once the order lands becomes the selection, so the new
        // troops can be sent straight on without hunting for them
        this.scene.getBatailleScene().selectStackAt({ x: this.town.tileX, y: this.town.tileY })
    }

    /** Place the ring over the town's current screen position and refresh affordability */
    private refresh() {
        if (!this.root || !this.town || !this.plate) {
            return
        }
        const camera = this.scene.getBatailleScene()?.cameras?.main
        if (!camera) {
            return
        }
        const worldX = this.town.tileX * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        const worldY = this.town.tileY * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2
        const x = ((worldX - camera.worldView.x) * camera.zoom) / RENDER_SCALE
        const y = ((worldY - camera.worldView.y) * camera.zoom) / RENDER_SCALE

        const { width, height } = getGameWindowSize(this.scene)
        const reach = ARC_RADIUS + SAT_RADIUS
        const onScreen = x > -reach && x < width + reach && y > -reach && y < height + reach
        this.root.setVisible(onScreen)
        if (!onScreen) {
            return
        }

        // Always concentric with the city: the plate is clear in the middle so the selected counter
        // sits inside the ring, and nudging the ring away would break that relationship.
        this.root.setPosition(Math.round(x), Math.round(y))

        // Flip below the city when the arc would run off the top of the view
        const direction = y - reach - 24 < 0 ? 1 : -1
        if (direction !== this.direction) {
            this.direction = direction
            this.layoutSatellites(direction)
        }

        const money = this.scene.getState()?.cp.m ?? 0
        if (money !== this.lastMoney) {
            this.lastMoney = money
            this.paintAffordability(money)
        }
    }

    private layoutSatellites(direction: number) {
        this.title?.setPosition(0, direction * (ARC_RADIUS + SAT_RADIUS + 16))
        this.hint?.setPosition(0, -direction * (SAT_RADIUS + 24))

        // Keyed off the tween, not the value: the ease overshoots past 1 and would flicker between
        // the animated scale and the hover-owned one
        const settled = !this.spreadTween
        this.satellites.forEach((sat, index) => {
            // Each satellite trails the one before it, so the three read as a fan rather than a pop.
            // The head start is divided out per satellite so they all land exactly on the arc.
            const headStart = index * SPREAD_STAGGER
            const reach = Math.max(0, (this.spread - headStart) / (1 - headStart))
            const radians = Phaser.Math.DEG_TO_RAD * ANGLES[index]
            const satX = Math.sin(radians) * ARC_RADIUS * reach
            const satY = direction * Math.cos(radians) * ARC_RADIUS * reach
            sat.container.setPosition(satX, satY)
            // the cap is a child of the ring, so its position is relative to the town, not the screen
            sat.cap.setPosition(satX, satY + SAT_RADIUS + 3)

            if (!settled) {
                // Hover and press own the scale once the ring has settled, so stop touching it then
                const grow = Math.min(1, reach)
                sat.container.setScale(0.55 + 0.45 * grow)
                sat.container.setAlpha(Math.min(1, grow * 1.6))
                sat.cap.container.setAlpha(Math.min(1, Math.max(0, grow * 2 - 0.8)))
            } else {
                sat.container.setAlpha(1)
                sat.cap.container.setAlpha(1)
            }
        })
    }

    private paintAffordability(money: number) {
        this.satellites.forEach((sat) => {
            const count = musterCount(sat.option, money)
            const affordable = count >= 1
            const wasAffordable = sat.affordable
            sat.affordable = affordable
            // A pack that the treasury only half covers says so rather than switching off: with 4
            // in the bank `+10` reads `+4` and raises four. `+all` already names itself.
            const clamped = sat.option.amount !== 'all' && affordable && count < sat.option.amount
            sat.label.setText(clamped ? `+${count}` : sat.option.label)
            // Broke: the price shown is what the pack would cost, not the nothing it buys today
            const nominal = sat.option.amount === 'all' ? money : sat.option.amount * UnitsType.Stick
            sat.cost.setText(`${affordable ? count * UnitsType.Stick : nominal}$`)
            sat.face.setTexture(affordable ? SAT_TEXTURE : SAT_OFF_TEXTURE)
            if (!affordable && wasAffordable) {
                sat.hovered = false
                sat.container.setScale(1)
                sat.cap.setPressed(false)
            }
            sat.label.setAlpha(affordable ? 1 : 0.42)
            sat.cost.setAlpha(affordable ? 0.78 : 0.34)
            sat.cap.setEnabled(affordable)
        })
    }
}
