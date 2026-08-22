import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'
import { onUIDown } from '../../utils/uiEventGuard'

const PANEL_WIDTH = 340
const PANEL_HEIGHT = 100
const PANEL_PADDING = 10
const SLIDER_WIDTH = 200
const SLIDER_HEIGHT = 8
const HANDLE_RADIUS = 13
const SLIDER_COLOR = 0x673ab7

type Shapes = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Arc

/**
 * Bottom overlay shown when one of the current player stacks is selected.
 * The slider picks how many units of the stack will be sent to the destination tile
 * (click on the map). Default to the whole stack.
 */
export class UnitMoveOverlay {
    shapes: Shapes[] = []
    private maxAmount = 0
    private amount = 0
    private handle: Phaser.GameObjects.Arc | null = null
    private label: Phaser.GameObjects.Text | null = null
    private trackLeft = 0
    private escKey: Phaser.Input.Keyboard.Key | null = null

    constructor(private scene: UIScene) {}

    show(maxAmount: number) {
        this.hide()
        this.maxAmount = Math.max(1, Math.floor(maxAmount))
        this.amount = this.maxAmount

        const { width, height } = getGameWindowSize(this.scene)
        const centerX = width / 2
        const panelTop = height - PANEL_HEIGHT

        const panel = this.scene.add.rectangle(centerX, height - PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT)
        panel.setFillStyle(0x000000, 0.5)
        panel.setInteractive()
        panel.on(Phaser.Input.Events.POINTER_DOWN, onUIDown)

        const label = this.scene.add.text(centerX, panelTop + PANEL_PADDING, '', TEXT_STYLE)
        label.setOrigin(0.5, 0)
        this.label = label
        this.updateLabel()

        const hint = this.scene.add.text(
            centerX,
            panelTop + PANEL_PADDING + label.height + 4,
            'Click a destination tile to send',
            { ...TEXT_STYLE, fontSize: '12px' }
        )
        hint.setOrigin(0.5, 0)
        hint.setColor('#aaaaaa')

        const trackY = height - PANEL_PADDING - SLIDER_HEIGHT / 2 - 6
        this.trackLeft = centerX - SLIDER_WIDTH / 2
        const track = this.scene.add
            .rectangle(this.trackLeft, trackY, SLIDER_WIDTH, SLIDER_HEIGHT, 0xffffff, 0.35)
            .setOrigin(0, 0.5)

        const handle = this.scene.add.circle(0, trackY, HANDLE_RADIUS, SLIDER_COLOR)
        handle.setStrokeStyle(2, 0xffffff)
        handle.setInteractive({ draggable: true })
        handle.on(Phaser.Input.Events.POINTER_DOWN, onUIDown)
        handle.on(
            Phaser.Input.Events.DRAG,
            (_pointer: Phaser.Input.Pointer, dragX: number) => {
                this.setHandlePosition(dragX)
            }
        )

        const cancelButton = this.scene.add.text(
            centerX + PANEL_WIDTH / 2 - PANEL_PADDING,
            panelTop + PANEL_PADDING,
            '✕',
            TEXT_STYLE
        )
        cancelButton.setOrigin(1, 0)
        cancelButton.setInteractive()
        cancelButton.on(Phaser.Input.Events.POINTER_DOWN, onUIDown)
        cancelButton.on(Phaser.Input.Events.POINTER_UP, () => {
            this.scene.onUnitDeselected()
        })

        this.shapes.push(panel, label, hint, track, handle, cancelButton)
        this.handle = handle
        this.label = label
        this.setHandlePosition(this.trackLeft + SLIDER_WIDTH) // default: whole stack
        this.updateLabel()

        this.escKey = this.scene.input.keyboard!.addKey('ESC', true, true)
        this.escKey.on('down', () => {
            this.scene.onUnitDeselected()
        })
    }

    hide() {
        if (this.escKey) {
            this.scene.input.keyboard!.removeKey('ESC')
            this.escKey = null
        }
        this.shapes.forEach((shape) => {
            shape.removeAllListeners()
            shape.destroy()
        })
        this.shapes = []
        this.handle = null
        this.label = null
    }

    getAmount(): number {
        return this.amount
    }

    private setHandlePosition(x: number) {
        if (!this.handle) {
            return
        }
        const clampedX = Phaser.Math.Clamp(x, this.trackLeft, this.trackLeft + SLIDER_WIDTH)
        this.handle.x = clampedX
        const ratio = (clampedX - this.trackLeft) / SLIDER_WIDTH
        this.amount = Math.max(1, Math.min(this.maxAmount, Math.round(ratio * (this.maxAmount - 1)) + 1))
        this.updateLabel()
    }

    private updateLabel() {
        if (this.label) {
            this.label.setText(`Move ${this.amount} / ${this.maxAmount} units`)
        }
    }
}
