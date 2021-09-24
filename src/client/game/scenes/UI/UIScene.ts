import 'phaser'
import { BaseScene } from '../BaseScene'
import { CurrentUserStats } from './CurrentUserStats'
import { BuildingOverlay } from './BuildingOverlay'
import { Building } from '../../actors/buildings/Building'
import { Town } from '../../actors/buildings/Town'
import { ScoresStats } from './ScoresStats'
import { Message } from '../../../../server/model/types/Message'
import { MessagesUI } from './MessagesUI'

export class UIScene extends BaseScene {
    currentUserStats!: CurrentUserStats
    scoresStats!: ScoresStats
    buildingOverlay!: BuildingOverlay
    messagesUI!: MessagesUI

    constructor() {
        super('UI')
        this.onMessageReceived = this.onMessageReceived.bind(this)
    }

    create() {
        this.currentUserStats = new CurrentUserStats(this)
        this.scoresStats = new ScoresStats(this)
        this.buildingOverlay = new BuildingOverlay(this)
        this.messagesUI = new MessagesUI(this)
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        this.currentUserStats.update(this)
        this.scoresStats.update(this)
    }

    onBuildingSelected(building: Building) {
        if (building instanceof Town) {
            const town = building as Town
            const currentPlayerName = this.getState()?.cp.name
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

    onMessageReceived(message: Message) {
        this.messagesUI.onMessageReceived(message)
    }

    sendMessage(message: string) {
        this.actions.sendMessage(message)
    }
}
