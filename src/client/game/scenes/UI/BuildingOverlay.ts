import { UIScene } from './UIScene'
import { Town } from '../../actors/buildings/Town'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { UnitsType } from '../../../../common/UNITS'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'

const OVERLAY_WIDTH = 200
const OVERLAY_HEIGHT = 100
const OVERLAY_PADDING = 10

type Shapes = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text

const NEW_UNIT_SHORTCUT_BIS = 'R'
const NEW_UNIT_10X_SHORTCUT_BIS = 'T'

export class BuildingOverlay {
    shapes: Shapes[] = []
    selectedTown: Town | null = null

    constructor(private scene: UIScene) {}

    onTownSelected(town: Town) {
        if (this.selectedTown) {
            this.onEmptyTileSelected()
        }
        const { width, height } = getGameWindowSize(this.scene)
        const rectangle = this.scene.add.rectangle(
            width / 2,
            height - OVERLAY_HEIGHT / 2,
            OVERLAY_WIDTH,
            OVERLAY_HEIGHT
        )
        rectangle.setFillStyle(0x000000, 0.5)

        const newUnitText = this.scene.add.text(
            width / 2 - OVERLAY_WIDTH / 2 + OVERLAY_PADDING,
            height - OVERLAY_HEIGHT + OVERLAY_PADDING,
            `1 Unit ${UnitsType.Stick}$ (R)`,
            TEXT_STYLE
        )
        newUnitText.setPadding(12, 8, 12, 8)
        newUnitText.setBackgroundColor('#673AB7')
        newUnitText.setShadow(-1, -1, '#888', 1, true, true)
        newUnitText.setInteractive()
        newUnitText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.createUnit(1)
        })

        const newUnit10Text = this.scene.add.text(
            width / 2 - OVERLAY_WIDTH / 2 + OVERLAY_PADDING,
            height - OVERLAY_HEIGHT + OVERLAY_PADDING + OVERLAY_PADDING + newUnitText.height,
            `10 Unit ${UnitsType.Stick * 10}$ (T)`,
            TEXT_STYLE
        )
        newUnit10Text.setPadding(12, 8, 12, 8)
        newUnit10Text.setBackgroundColor('#673AB7')
        newUnit10Text.setShadow(-1, -1, '#888', 1, true, true)
        newUnit10Text.setInteractive()
        newUnit10Text.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.createUnit(10)
        })

        this.shapes.push(rectangle)
        this.shapes.push(newUnitText)
        this.shapes.push(newUnit10Text)
        this.listenForUnitShortcuts()
        this.selectedTown = town
    }

    listenForUnitShortcuts() {
        const newUnitKey = this.scene.input.keyboard.addKey(NEW_UNIT_SHORTCUT_BIS, true, true)
        newUnitKey.on('down', () => {
            this.createUnit(1)
        })
        const newUnit10XKey = this.scene.input.keyboard.addKey(NEW_UNIT_10X_SHORTCUT_BIS, true, true)

        newUnit10XKey.on('down', () => {
            this.createUnit(10)
        })
    }

    createUnit(unitCount: number) {
        if (!this.selectedTown) {
            return
        }
        this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y, unitCount)
    }

    onEmptyTileSelected() {
        this.scene.input.keyboard.removeKey(NEW_UNIT_SHORTCUT_BIS)
        this.scene.input.keyboard.removeKey(NEW_UNIT_10X_SHORTCUT_BIS)
        this.shapes.forEach((shape) => {
            shape.removeAllListeners()
            shape.destroy()
        })
        this.shapes = []
        this.selectedTown = null
    }
}
