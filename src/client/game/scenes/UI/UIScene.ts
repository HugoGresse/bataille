import 'phaser'
import { BaseScene } from '../BaseScene'
import { CurrentUserStats } from './CurrentUserStats'
import { Standings } from './Standings'
import { CityRing, MUSTER_OPTIONS } from './CityRing'
import { NoticeCentre } from './NoticeCentre'
import { NoticeFeed } from './NoticeFeed'
import { ChatInput } from './ChatInput'
import { KeyLegend } from './KeyLegend'
import { Building } from '../../actors/buildings/Building'
import { Town } from '../../actors/buildings/Town'
import { Message } from '../../../../server/model/types/Message'
import { laneFor } from './notices'
import { markUIPointer } from '../../utils/uiEventGuard'
import { RENDER_SCALE } from '../../utils/renderScale'

export class UIScene extends BaseScene {
    currentUserStats!: CurrentUserStats
    standings!: Standings
    cityRing!: CityRing
    noticeCentre!: NoticeCentre
    noticeFeed!: NoticeFeed
    private chatInput!: ChatInput
    private keyLegend!: KeyLegend

    constructor() {
        super('UI')
        this.onMessageReceived = this.onMessageReceived.bind(this)
    }

    create() {
        // HUD code lays out in CSS pixels; the camera maps those onto the device pixel buffer
        this.cameras.main.setZoom(RENDER_SCALE)
        this.cameras.main.centerOn(
            this.cameras.main.width / (2 * RENDER_SCALE),
            this.cameras.main.height / (2 * RENDER_SCALE)
        )
        this.currentUserStats = new CurrentUserStats(this)
        this.standings = new Standings(this)
        this.cityRing = new CityRing(this)
        this.noticeCentre = new NoticeCentre(this)
        this.noticeFeed = new NoticeFeed(this)
        this.chatInput = new ChatInput(this)
        this.keyLegend = new KeyLegend(this)

        this.bindKeys()
        this.scale.on('resize', () => this.noticeFeed.layout())
        this.events.once('shutdown', () => this.teardown())
    }

    update(time: number, delta: number) {
        super.update(time, delta)
        this.currentUserStats.update(this)
        this.standings.update(this)
        this.cityRing.update()
        this.noticeCentre.update()
    }

    /** A stack was selected: if it sits on one of our towns, the muster ring opens with it */
    onUnitSelected(town: Town | null) {
        if (town && this.isOwnedByCurrentPlayer(town)) {
            this.openRingFor(town)
        } else {
            this.cityRing.close()
        }
    }

    onUnitDeselected() {
        this.cityRing.close()
        this.getBatailleScene().clearUnitSelection(false)
    }

    onBuildingSelected(building: Building) {
        if (building instanceof Town && this.isOwnedByCurrentPlayer(building)) {
            this.openRingFor(building)
        }
    }

    /** An empty tile was clicked: nothing to muster from */
    onEmptyTileSelected() {
        this.cityRing.close()
    }

    onMessageReceived(message: Message) {
        const lane = laneFor(message, this.getState()?.cp.n)
        if (lane === 'centre') {
            this.noticeCentre.show(message)
        } else if (lane === 'feed') {
            this.noticeFeed.add(message)
        }
    }

    sendMessage(message: string) {
        this.actions.sendMessage(message)
    }

    /** UI widgets call this on pointer down so the map does not treat the same click as a tile */
    markUIPointer() {
        markUIPointer()
    }

    private openRingFor(town: Town) {
        const tile = town.getTile()
        this.cityRing.open(tile.x, tile.y, town.tileData.n)
    }

    private isOwnedByCurrentPlayer(town: Town): boolean {
        const currentPlayerName = this.getState()?.cp.n
        return !!currentPlayerName && town.tileData.p?.n === currentPlayerName
    }

    private bindKeys() {
        const keyboard = this.input.keyboard
        if (!keyboard) {
            return
        }

        MUSTER_OPTIONS.forEach((option) => {
            const key = keyboard.addKey(option.key, true, true)
            key.on('down', () => this.cityRing.pressKey(option.key))
        })

        const escape = keyboard.addKey('ESC', true, true)
        escape.on('down', () => {
            if (this.cityRing.isOpen()) {
                this.cityRing.close()
            }
            this.getBatailleScene().clearUnitSelection(false)
        })

        // '?' is Shift+/ on some layouts and its own key on others, so match the character
        keyboard.on('keydown', (event: KeyboardEvent) => {
            if (event.key === '?') {
                this.keyLegend.show()
            }
        })
        keyboard.on('keyup', (event: KeyboardEvent) => {
            if (event.key === '?' || event.key === 'Shift') {
                this.keyLegend.hide()
            }
        })
    }

    private teardown() {
        this.cityRing.close()
        this.noticeCentre.clear()
        this.noticeFeed.destroy()
        this.standings.destroy()
        this.currentUserStats.destroy()
        this.chatInput.destroy()
        this.keyLegend.destroy()
    }
}
