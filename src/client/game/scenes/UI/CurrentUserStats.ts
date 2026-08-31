import * as Phaser from 'phaser'
import { BaseScene } from '../BaseScene'
import { crispText } from './crispText'

const LEFT = 12
const TOP = 12
const PAD_X = 9
const PAD_Y = 5

/**
 * The wallet: what you can spend, and how long until more. Everything else about the players now
 * lives in the standings panel below it.
 */
export class CurrentUserStats {
    private panel: Phaser.GameObjects.Rectangle
    private money: Phaser.GameObjects.Text
    private next: Phaser.GameObjects.Text
    private lastMoney = -1
    private lastNext = -1

    constructor(scene: Phaser.Scene) {
        this.panel = scene.add.rectangle(LEFT, TOP, 120, 28, 0x060a12, 0.74)
        this.panel.setOrigin(0, 0)
        this.panel.setStrokeStyle(1, 0xffffff, 0.16)

        this.money = crispText(scene, LEFT + PAD_X, TOP + PAD_Y, '0', {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontStyle: 'bold',
            fontSize: '17px',
            color: '#ffffff',
        })
        this.next = crispText(scene, LEFT + PAD_X, TOP + PAD_Y + 6, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '9px',
            color: '#ffffff',
        })
        this.next.setAlpha(0.6)
    }

    update(scene: BaseScene) {
        const state = scene.getState()
        const player = state?.cp
        if (!player) {
            return
        }

        const seconds = state?.ni ?? 0
        if (this.lastMoney === player.m && this.lastNext === seconds) {
            return
        }
        this.lastMoney = player.m
        this.lastNext = seconds
        this.money.setText(`${player.m}$`)
        this.next.setText(`+${player.i}$ IN ${seconds}s`)

        // The panel hugs its contents: the treasury grows past four digits in a long game
        this.next.setX(LEFT + PAD_X + this.money.width + 8)
        this.panel.width = PAD_X * 2 + this.money.width + 8 + this.next.width
    }

    destroy() {
        this.panel.destroy()
        this.money.destroy()
        this.next.destroy()
    }
}
