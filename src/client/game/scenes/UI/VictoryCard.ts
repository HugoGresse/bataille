import * as Phaser from 'phaser'
import { Message } from '../../../../server/model/types/Message'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { toColorNumber } from '../../utils/colors'
import { crispText } from './crispText'
import { hudFont, hudPx } from './hudScale'
import { victoryAnnouncement } from './notices'

const MAX_WIDTH = hudPx(300)
const SIDE_MARGIN = hudPx(12)
const HEIGHT = hudPx(132)
const ACCENT_HEIGHT = hudPx(5)
const PANEL = 0x080d18
const RISE_MS = 420

export class VictoryCard {
    private root: Phaser.GameObjects.Container | null = null

    constructor(private scene: Phaser.Scene) {}

    show(message: Message, currentPlayerName: string | undefined) {
        const announcement = victoryAnnouncement(message.content, currentPlayerName)
        if (!announcement) {
            return
        }
        this.clear()

        const accentColor = toColorNumber(message.player?.c, 0xffd54f)
        const { width, height } = getGameWindowSize(this.scene)
        const cardWidth = Math.min(MAX_WIDTH, width - SIDE_MARGIN * 2)

        const glow = this.scene.add.rectangle(0, 0, cardWidth + hudPx(16), HEIGHT + hudPx(16), accentColor, 0.12)
        const panel = this.scene.add.rectangle(0, 0, cardWidth, HEIGHT, PANEL, 0.96)
        panel.setStrokeStyle(1, accentColor, 0.55)
        const accent = this.scene.add.rectangle(
            0,
            -HEIGHT / 2 + ACCENT_HEIGHT / 2,
            cardWidth,
            ACCENT_HEIGHT,
            accentColor
        )

        const kicker = crispText(this.scene, 0, -hudPx(38), announcement.mine ? 'GAME OVER' : 'GAME WON BY', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: hudFont(10),
            color: '#ffffff',
        })
        kicker.setOrigin(0.5, 0.5).setAlpha(0.6)

        const title = crispText(this.scene, 0, -hudPx(8), announcement.title.toUpperCase(), {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontStyle: 'bold',
            fontSize: hudFont(30),
            color: '#ffffff',
        })
        title.setOrigin(0.5, 0.5)

        const detail = crispText(this.scene, 0, hudPx(30), announcement.detail, {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: hudFont(12),
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: cardWidth - hudPx(28) },
        })
        detail.setOrigin(0.5, 0.5).setAlpha(0.75)

        this.root = this.scene.add.container(Math.round(width / 2), Math.round(height / 2), [
            glow,
            panel,
            accent,
            kicker,
            title,
            detail,
        ])
        this.root.setAlpha(0).setScale(0.88)
        this.scene.tweens.add({
            targets: this.root,
            alpha: 1,
            scale: 1,
            duration: RISE_MS,
            ease: 'Back.easeOut',
        })
    }

    layout() {
        if (!this.root) {
            return
        }
        const { width, height } = getGameWindowSize(this.scene)
        this.root.setPosition(Math.round(width / 2), Math.round(height / 2))
    }

    clear() {
        this.root?.destroy(true)
        this.root = null
    }
}
