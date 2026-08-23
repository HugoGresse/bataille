import 'phaser'
import { BaseScene } from '../BaseScene'
import { CurrentUserStats } from './CurrentUserStats'
import {
    BuildingOverlay,
    BuildingOverlayPlacement,
    OVERLAY_HEIGHT as TOWN_PANEL_HEIGHT,
    OVERLAY_WIDTH as TOWN_PANEL_WIDTH,
} from './BuildingOverlay'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { UnitMoveOverlay } from './UnitMoveOverlay'
import { Building } from '../../actors/buildings/Building'
import { Town } from '../../actors/buildings/Town'
import { ScoresStats } from './ScoresStats'
import { Message } from '../../../../server/model/types/Message'
import { MessagesUI } from './MessagesUI'

const BOTTOM_PANELS_GAP = 10

export class UIScene extends BaseScene {
    currentUserStats!: CurrentUserStats
    scoresStats!: ScoresStats
    buildingOverlay!: BuildingOverlay
    unitMoveOverlay!: UnitMoveOverlay
    messagesUI!: MessagesUI
    /** Town the selected stack is parked on: its buy panel is shown next to the move panel */
    private selectedUnitTown: Town | null = null

    constructor() {
        super('UI')
        this.onMessageReceived = this.onMessageReceived.bind(this)
    }

    create() {
        this.currentUserStats = new CurrentUserStats(this)
        this.scoresStats = new ScoresStats(this)
        this.buildingOverlay = new BuildingOverlay(this)
        this.unitMoveOverlay = new UnitMoveOverlay(this)
        this.messagesUI = new MessagesUI(this)
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        this.currentUserStats.update(this)
        this.scoresStats.update(this)
    }

    onBuildingSelected(building: Building) {
        if (building instanceof Town) {
            if (this.isOwnedByCurrentPlayer(building)) {
                this.showTownPanel(building)
            }
        } else {
            console.log(building)
        }
    }

    onEmptyTileSelected() {
        this.buildingOverlay.onEmptyTileSelected()
    }

    /**
     * @param town the town the stack is parked on, if any: when it is ours, its buy panel is shown next
     * to the move panel so the stack can be reinforced without deselecting it
     */
    onUnitSelected(unitId: string, hp: number, town: Town | null) {
        this.buildingOverlay.onEmptyTileSelected() // a town overlay may be open, close it
        this.unitMoveOverlay.show(hp)
        this.selectedUnitTown = town && this.isOwnedByCurrentPlayer(town) ? town : null
        if (this.selectedUnitTown) {
            this.showTownPanel(this.selectedUnitTown)
        }
    }

    /**
     * The town buy panel is bottom centered, but has to make room for the unit move panel when a
     * stack is selected (both are shown together for a stack parked on one of our towns).
     * Single entry point: the town sprite also emits its own pointer up, in any order.
     */
    private showTownPanel(town: Town) {
        this.buildingOverlay.onTownSelected(
            town,
            this.unitMoveOverlay.isVisible() ? this.getSidePlacement() : undefined
        )
    }

    /** Right of the move panel, or stacked above it when the window is too narrow */
    private getSidePlacement(): BuildingOverlayPlacement {
        const { width, height } = getGameWindowSize(this)
        const movePanel = this.unitMoveOverlay.getPanelBounds()
        const left = movePanel.right + BOTTOM_PANELS_GAP
        if (left + TOWN_PANEL_WIDTH <= width) {
            return { left, top: height - TOWN_PANEL_HEIGHT }
        }
        return {
            left: width / 2 - TOWN_PANEL_WIDTH / 2,
            top: movePanel.top - BOTTOM_PANELS_GAP - TOWN_PANEL_HEIGHT,
        }
    }

    /** The selected stack grew (reinforced, merged) or shrank (fight): keep the slider bounds in sync */
    onSelectedUnitUpdated(hp: number) {
        this.unitMoveOverlay.updateMaxAmount(hp)
    }

    onUnitDeselected() {
        const openTown = this.buildingOverlay.selectedTown
        this.unitMoveOverlay.hide()
        if (openTown && openTown !== this.selectedUnitTown) {
            this.showTownPanel(openTown) // another town panel is open (destination click): re-center it
        } else if (openTown) {
            this.buildingOverlay.onEmptyTileSelected()
        }
        this.selectedUnitTown = null
        this.getBatailleScene().clearUnitSelection(false)
    }

    private isOwnedByCurrentPlayer(town: Town): boolean {
        const currentPlayerName = this.getState()?.cp.n
        return !!currentPlayerName && town.tileData.p?.n === currentPlayerName
    }

    getUnitMoveAmount(): number {
        return this.unitMoveOverlay.getAmount()
    }

    onMessageReceived(message: Message) {
        this.messagesUI.onMessageReceived(message)
    }

    sendMessage(message: string) {
        this.actions.sendMessage(message)
    }
}
