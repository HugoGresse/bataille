import {UIScene} from './UIScene'
import {Town} from '../../actors/buildings/Town'
import {getGameWindowSize} from '../../../utils/getGameWindowSize'
import {UnitsType} from '../../../../common/UNITS'
import {TEXT_STYLE} from '../../../utils/TEXT_STYLE'

const OVERLAY_WIDTH = 200
const OVERLAY_HEIGHT = 50
const OVERLAY_PADDING = 10

type Shapes = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text

const NEW_UNIT_SHORTCUT_BIS = "R"
const NEW_UNIT_10X_SHORTCUT_BIS = "T"

export class BuildingOverlay {

    shapes: Shapes[] = []
    selectedTown: Town | null = null

    constructor(private scene: UIScene) {
    }

    onTownSelected(town: Town) {
        if(this.selectedTown ){
            this.onEmptyTileSelected()
        }
        const {width, height} = getGameWindowSize(this.scene)
        const rectangle = this.scene.add.rectangle(width/2, height - OVERLAY_HEIGHT/2, OVERLAY_WIDTH, OVERLAY_HEIGHT)
        rectangle.setFillStyle(0xFF0000, 1)

        const newUnitText = this.scene.add.text(width/2 - OVERLAY_WIDTH/2 + OVERLAY_PADDING, height - OVERLAY_HEIGHT + OVERLAY_PADDING,  `New Unit ${UnitsType.Stick}$ (R) (T: 10x)`, TEXT_STYLE)
        newUnitText.setInteractive()

        this.selectedTown = town

        newUnitText.on(Phaser.Input.Events.POINTER_UP, () => {
            if(this.selectedTown) {
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
            }
        })

        this.shapes.push(rectangle)
        this.shapes.push(newUnitText)

        const newUnitKey = this.scene.input.keyboard.addKey(NEW_UNIT_SHORTCUT_BIS, true, true);
        newUnitKey.on('down', () =>  {
            if(this.selectedTown) {
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
            }
        });
        const newUnit10XKey = this.scene.input.keyboard.addKey(NEW_UNIT_10X_SHORTCUT_BIS, true, true);

        newUnit10XKey.on('down', () =>  {
            if(this.selectedTown) { this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
                this.scene.actions.newUnit(this.selectedTown.x, this.selectedTown.y)
            }
        });
    }

    onEmptyTileSelected() {
        this.scene.input.keyboard.removeKey(NEW_UNIT_SHORTCUT_BIS);
        this.scene.input.keyboard.removeKey(NEW_UNIT_10X_SHORTCUT_BIS);
        this.shapes.forEach(shape => {
            shape.removeAllListeners()
            shape.destroy()
        })
        this.shapes = []
        this.selectedTown = null

    }
}
