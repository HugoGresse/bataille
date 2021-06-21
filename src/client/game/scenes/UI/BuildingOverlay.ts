import {UIScene} from './UIScene'
import {Town} from '../../actors/buildings/Town'
import {getGameWindowSize} from '../../../utils/getGameWindowSize'

const textStyle = {
    color: '#FFFFFF', fontFamily: 'sans-serif',
}
const OVERLAY_WIDTH = 200
const OVERLAY_HEIGHT = 50
const OVERLAY_PADDING = 10

type Shapes = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text

export class BuildingOverlay {

    shapes: Shapes[] = []

    constructor(private scene: UIScene) {
    }

    onTownSelected(town: Town) {
        const {width, height} = getGameWindowSize(this.scene)
        const rectangle = this.scene.add.rectangle(width/2, height - OVERLAY_HEIGHT/2, OVERLAY_WIDTH, OVERLAY_HEIGHT)
        rectangle.setFillStyle(0xFF0000, 1)

        const text = this.scene.add.text(width/2 - OVERLAY_WIDTH/2 + OVERLAY_PADDING, height - OVERLAY_HEIGHT + OVERLAY_PADDING, 'New Unit (1$)', textStyle)
        text.setInteractive()
        text.on(Phaser.Input.Events.POINTER_UP, () => {
            this.scene.actions.newUnit(town.x, town.y)
        })

        this.shapes.push(rectangle)
        this.shapes.push(text)
    }

    onEmptyTileSelected() {
        this.shapes.forEach(shape => {
            shape.destroy()
        })
        this.shapes = []
    }
}
