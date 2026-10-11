import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { Keycap } from './Keycap'
import { MAX_UNIT_LIFE, roomInStack, TILE_WIDTH_HEIGHT, UnitsType } from '../../../../common/UNITS'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { ensureRingTextures, PLATE_TEXTURE, SAT_OFF_TEXTURE, SAT_TEXTURE } from './ringTextures'
import { MUSTER_OPTIONS, MusterOption, musterCount } from '../../utils/muster'
import { RENDER_SCALE, worldToHud } from '../../utils/renderScale'
import { COMPACT_QUERY, MENU_CORNER_PX } from '../../compactLayout'
import { crispText } from './crispText'
import { chooseHeading, fanPoint, Rect, RingGeometry } from './ringHeading'

/** Screen-space geometry: the ring is the same size at every zoom level */
const ARC_RADIUS = 92
const SAT_RADIUS = 25
const PLATE_RADIUS = 66
/** Pad in the satellite texture that carries its rim highlight */
const SAT_TEXTURE_PAD = 3
/** The close button sits on the side of the city away from the fan */
const CLOSE_RADIUS = 14
const CLOSE_DISTANCE = SAT_RADIUS + 26
/** Keycap hanging under each satellite, which the fan has to keep on screen too */
const CAP_HEIGHT = 16

const HOVER_SCALE = 1.07
const PRESS_SCALE = 0.93

/** The ring fans out of the city rather than appearing on top of it */
const PLATE_IN_MS = 200
const SPREAD_MS = 300
/** Head start each satellite gives the next one, as a fraction of the spread */
const SPREAD_STAGGER = 0.12

/** Angles off the fan's heading, which is itself measured from straight up, clockwise */
const ANGLES = [-52, 0, 52]
const GEOMETRY: RingGeometry = {
    spread: ANGLES,
    arcRadius: ARC_RADIUS,
    satRadius: SAT_RADIUS,
    capHeight: CAP_HEIGHT,
    closeDistance: CLOSE_DISTANCE,
    closeRadius: CLOSE_RADIUS,
}
/** Towns further than this from the city on screen cannot sit under the fan, whichever way it points */
const OBSTACLE_REACH = ARC_RADIUS + SAT_RADIUS * 2

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
    private closeButton: Phaser.GameObjects.Container | null = null
    private satellites: Satellite[] = []
    private town: { tileX: number; tileY: number; name?: string } | null = null
    /**
     * Which way the fan points, chosen to keep clear of neighbouring towns and the screen edge. Null
     * until the ring has been placed once. Layout only changes when it turns or the treasury moves;
     * the anchor moves every frame.
     */
    private heading: number | null = null
    /** Where the heading was last worked out from: it only needs redoing once the city moves on screen */
    private headingFrom = ''
    private lastMoney = -1
    private lastStackHP = -1
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

        this.heading = null
        this.headingFrom = ''
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

        this.closeButton = this.buildCloseButton()
        this.root.add(this.closeButton)
        // A keyboard is there to use: say which key does what the button does
        if (!this.scene.sys.game.device.input.touch) {
            this.hint = crispText(this.scene, 0, 0, 'ESC', {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '9px',
                color: '#ffffff',
            })
            this.hint.setOrigin(0.5, 0)
            this.hint.setAlpha(0.55)
            this.root.add(this.hint)
        }

        MUSTER_OPTIONS.forEach((option, index) => {
            this.satellites.push(this.buildSatellite(option, index))
        })

        this.refresh()
        this.playOpenAnimation()
    }

    /** ✕ beside the city: drops the ring and the stack it was opened with, the way Escape does twice */
    private buildCloseButton(): Phaser.GameObjects.Container {
        const disc = this.scene.add.circle(0, 0, CLOSE_RADIUS, 0x1b2130, 0.92)
        disc.setStrokeStyle(1.5, 0xffffff, 0.6)
        const cross = crispText(this.scene, 0, 0, '✕', {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
        })
        cross.setOrigin(0.5, 0.5)
        const button = this.scene.add.container(0, 0, [disc, cross])
        button.setSize(CLOSE_RADIUS * 2, CLOSE_RADIUS * 2)
        button.setInteractive(
            new Phaser.Geom.Circle(CLOSE_RADIUS, CLOSE_RADIUS, CLOSE_RADIUS),
            Phaser.Geom.Circle.Contains
        )
        if (button.input) {
            button.input.cursor = 'pointer'
        }
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            this.scene.markUIPointer(pointer)
            button.setScale(PRESS_SCALE)
        })
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => button.setScale(1))
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.scene.dismissRingAndSelection())
        return button
    }

    /** The plate blooms out of the city and the satellites fan off it, one just behind the next */
    private playOpenAnimation() {
        this.plate?.setScale(0.68)
        this.plate?.setAlpha(0)
        this.title?.setAlpha(0)
        this.hint?.setAlpha(0)
        this.closeButton?.setAlpha(0)
        this.scene.tweens.add({
            targets: this.plate,
            scale: 1,
            alpha: 1,
            duration: PLATE_IN_MS,
            ease: 'Cubic.easeOut',
        })
        this.scene.tweens.add({
            targets: [this.title, this.hint, this.closeButton].filter(Boolean),
            alpha: { from: 0, to: 0.78 },
            duration: PLATE_IN_MS,
            delay: 70,
            ease: 'Cubic.easeOut',
        })
        this.playSpread()
    }

    /** The satellites fan off the city, one just behind the next: on open, and again when it turns */
    private playSpread() {
        this.spreadTween?.stop()
        this.spread = 0
        this.layoutSatellites()

        this.spreadTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: SPREAD_MS,
            ease: 'Back.easeOut',
            onUpdate: (tween) => {
                this.spread = tween.getValue() ?? 1
                this.layoutSatellites()
            },
            onComplete: () => {
                this.spread = 1
                this.spreadTween = null
                this.layoutSatellites()
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
        this.closeButton = null
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

    /** The stack standing on this town, which is what the muster has to fit into */
    private stackHP(): number {
        if (!this.town) {
            return 0
        }
        return this.scene.getBatailleScene()?.getStackHPAt({ x: this.town.tileX, y: this.town.tileY }) ?? 0
    }

    private buy(option: MusterOption) {
        if (!this.town) {
            return
        }
        const money = this.scene.getState()?.cp.m ?? 0
        const count = musterCount(option, money, this.stackHP())
        if (count < 1) {
            return
        }
        // The server clamps to what the treasury and the stack actually cover
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
        const { x, y } = worldToHud(camera, worldX, worldY)

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

        // Point the fan wherever it hides the fewest neighbouring towns and stays on screen
        const from = `${Math.round(x)},${Math.round(y)},${camera.zoom},${width},${height}`
        const heading =
            from === this.headingFrom
                ? this.heading
                : chooseHeading(
                      { x, y },
                      this.nearbyTowns(camera, worldX, worldY),
                      { width, height, reserved: this.reservedAreas(width) },
                      GEOMETRY,
                      this.heading
                  )
        this.headingFrom = from
        if (heading !== this.heading) {
            const firstPlacement = this.heading === null
            this.heading = heading
            if (firstPlacement || this.spreadTween) {
                this.layoutSatellites()
            } else {
                this.playSpread() // swinging round in one frame would read as a glitch
            }
        }

        const money = this.scene.getState()?.cp.m ?? 0
        const stackHP = this.stackHP()
        if (money !== this.lastMoney || stackHP !== this.lastStackHP) {
            this.lastMoney = money
            this.lastStackHP = stackHP
            this.paintAffordability(money, stackHP)
        }
    }

    /**
     * Screen positions of the other towns close enough to the city to end up under the fan. Picked
     * out in world space first, so only that handful is projected onto the screen.
     */
    private nearbyTowns(camera: Phaser.Cameras.Scene2D.Camera, worldX: number, worldY: number) {
        const reach = OBSTACLE_REACH / (camera.zoom / RENDER_SCALE)
        return this.scene
            .getBatailleScene()
            .getTownCenters()
            .filter((town) => {
                const dx = town.x - worldX
                const dy = town.y - worldY
                // The city itself sits at the centre, under the clear middle of the plate
                return (dx !== 0 || dy !== 0) && dx * dx + dy * dy < reach * reach
            })
            .map((town) => worldToHud(camera, town.x, town.y))
    }

    /** Controls drawn over the map that a satellite or the close button must not end up under */
    private reservedAreas(width: number): Rect[] {
        const reserved: Rect[] = [this.scene.noticeFeed.getBounds()]
        if (window.matchMedia(COMPACT_QUERY).matches) {
            reserved.push({ x: width - MENU_CORNER_PX, y: 0, width: MENU_CORNER_PX, height: MENU_CORNER_PX })
        }
        return reserved
    }

    private layoutSatellites() {
        const heading = this.heading ?? 0
        const origin = { x: 0, y: 0 }
        // The title sits past the fan; pushed further out sideways so it clears the outer satellite
        const titleReach = ARC_RADIUS + SAT_RADIUS + 16 + Math.abs(Math.sin((heading * Math.PI) / 180)) * 30
        const title = fanPoint(origin, heading, titleReach)
        this.title?.setPosition(Math.round(title.x), Math.round(title.y))
        const close = fanPoint(origin, heading + 180, CLOSE_DISTANCE)
        this.closeButton?.setPosition(Math.round(close.x), Math.round(close.y))
        this.hint?.setPosition(Math.round(close.x), Math.round(close.y) + CLOSE_RADIUS + 3)

        // Keyed off the tween, not the value: the ease overshoots past 1 and would flicker between
        // the animated scale and the hover-owned one
        const settled = !this.spreadTween
        this.satellites.forEach((sat, index) => {
            // Each satellite trails the one before it, so the three read as a fan rather than a pop.
            // The head start is divided out per satellite so they all land exactly on the arc.
            const headStart = index * SPREAD_STAGGER
            const reach = Math.max(0, (this.spread - headStart) / (1 - headStart))
            const { x: satX, y: satY } = fanPoint(origin, heading + ANGLES[index], ARC_RADIUS * reach)
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

    private paintAffordability(money: number, stackHP: number) {
        const full = roomInStack(stackHP, 1) < 1
        this.satellites.forEach((sat) => {
            const count = musterCount(sat.option, money, stackHP)
            const affordable = count >= 1
            const wasAffordable = sat.affordable
            sat.affordable = affordable
            // The face says what pressing it actually raises: with 4 in the bank, or 4 places left
            // in the stack, `+10` reads `+4`. A stack with no room left says so instead of a price.
            sat.label.setText(full ? 'FULL' : affordable ? `+${count}` : sat.option.label)
            // Broke: the price shown is what the pack would cost, not the nothing it buys today
            const nominal = sat.option.amount === 'all' ? money : sat.option.amount * UnitsType.Stick
            sat.cost.setText(full ? `${MAX_UNIT_LIFE} MAX` : `${affordable ? count * UnitsType.Stick : nominal}$`)
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
