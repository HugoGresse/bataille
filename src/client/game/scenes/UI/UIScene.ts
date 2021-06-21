import 'phaser'
import {BaseScene} from '../BaseScene'
import {ScoreDisplay} from './ScoreDisplay'
import {BuildingOverlay} from './BuildingOverlay'
import {Building} from '../../actors/buildings/Building'
import {Town} from '../../actors/buildings/Town'

export class UIScene extends BaseScene {

    scoreDisplay !: ScoreDisplay
    buildingOverlay !: BuildingOverlay

    constructor() {
        super('UI')
    }

    create() {
        this.scoreDisplay = new ScoreDisplay(this)
        this.buildingOverlay = new BuildingOverlay(this)
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        this.scoreDisplay.update(this)
    }

    onBuildingSelected(building: Building) {

        if(building instanceof Town) {
            const town = building as Town
            this.buildingOverlay.onTownSelected(town)
        } else {
            console.log(building)
        }

    }

    onEmptyTileSelected () {
        this.buildingOverlay.onEmptyTileSelected()
    }

}
