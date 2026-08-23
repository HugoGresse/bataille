import * as Phaser from 'phaser'
import { Keycap } from './Keycap'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { crispText } from './crispText'

const WIDTH = 250
const ROW_HEIGHT = 22
const PAD = 12

const ROWS: { key: string; what: string }[] = [
    { key: 'R', what: 'muster 1 unit' },
    { key: 'T', what: 'muster 10' },
    { key: 'Y', what: 'muster all' },
    { key: 'W A S D', what: 'pan the map' },
    { key: 'Enter', what: 'say something' },
    { key: 'Esc', what: 'close / deselect' },
    { key: 'Shift', what: 'send half a stack' },
    { key: 'Alt', what: 'send one unit' },
]

/**
 * Held while `?` is down. The only place keys are listed away from the control they fire, which is
 * why it is a hold rather than a panel that stays open.
 */
export class KeyLegend {
    private root: Phaser.GameObjects.Container | null = null
    private caps: Keycap[] = []

    constructor(private scene: Phaser.Scene) {}

    show() {
        if (this.root) {
            return
        }
        const { width, height } = getGameWindowSize(this.scene)
        const panelHeight = ROWS.length * ROW_HEIGHT + PAD * 2
        const left = width / 2 - WIDTH / 2
        const top = height / 2 - panelHeight / 2

        const panel = this.scene.add.rectangle(left, top, WIDTH, panelHeight, 0x060a12, 0.92)
        panel.setOrigin(0, 0)
        panel.setStrokeStyle(1, 0xffffff, 0.2)
        this.root = this.scene.add.container(0, 0, [panel])

        ROWS.forEach((row, index) => {
            const y = top + PAD + index * ROW_HEIGHT + ROW_HEIGHT / 2
            let x = left + PAD + 14
            row.key.split(' ').forEach((key) => {
                const cap = new Keycap(this.scene, x, y, key)
                this.caps.push(cap)
                this.root?.add(cap.container)
                x += cap.container.width + 5
            })
            const what = crispText(this.scene, left + WIDTH - PAD, y, row.what, {
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '11px',
                color: '#ffffff',
            })
            what.setOrigin(1, 0.5)
            what.setAlpha(0.75)
            this.root?.add(what)
        })
    }

    hide() {
        this.caps.forEach((cap) => cap.destroy())
        this.caps = []
        this.root?.destroy(true)
        this.root = null
    }

    destroy() {
        this.hide()
    }
}
