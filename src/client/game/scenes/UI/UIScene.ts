import 'phaser'
import { BaseScene } from '../BaseScene'
import { CurrentUserStats } from './CurrentUserStats'
import { BuildingOverlay } from './BuildingOverlay'
import { Building } from '../../actors/buildings/Building'
import { Town } from '../../actors/buildings/Town'
import { ScoresStats } from './ScoresStats'

export class UIScene extends BaseScene {
    currentUserStats!: CurrentUserStats
    scoresStats!: ScoresStats
    buildingOverlay!: BuildingOverlay

    constructor() {
        super('UI')
    }

    create() {
        this.currentUserStats = new CurrentUserStats(this)
        this.scoresStats = new ScoresStats(this)
        this.buildingOverlay = new BuildingOverlay(this)
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        this.currentUserStats.update(this)
        this.scoresStats.update(this)
    }

    onBuildingSelected(building: Building) {
        if (building instanceof Town) {
            const town = building as Town
            const currentPlayerName = this.getState()?.currentPlayer.name
            if (town.tileData.player?.name === currentPlayerName) {
                this.buildingOverlay.onTownSelected(town)
            }
        } else {
            console.log(building)
        }
    }

    onEmptyTileSelected() {
        this.buildingOverlay.onEmptyTileSelected()
    }
}
