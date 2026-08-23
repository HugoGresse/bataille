import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { Message } from '../../../../server/model/types/Message'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { toColorNumber, toCssColor } from '../../utils/colors'
import { crispText } from './crispText'

const MAX_STACKED = 3
const LIFETIME_MS = 4000
const CARD_HEIGHT = 30
const GAP = 6
const PAD_X = 12
const TOP_RATIO = 0.3
const FADE_MS = 180

type Card = {
    container: Phaser.GameObjects.Container
    bornAt: number
}

/**
 * Your own business, in the middle. Only events that touch you land here, so the centre of the
 * screen stays empty during the early-game land grab.
 */
export class NoticeCentre {
    private cards: Card[] = []

    constructor(private scene: UIScene) {}

    show(message: Message) {
        const { width, height } = getGameWindowSize(this.scene)
        const accent = toColorNumber(message.player?.c, 0xffffff)
        const text = crispText(this.scene, 0, 0, this.format(message), {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
        })
        text.setOrigin(0, 0.5)

        const cardWidth = text.width + PAD_X * 2 + 6
        const background = this.scene.add.rectangle(0, 0, cardWidth, CARD_HEIGHT, 0x080d18, 0.88)
        background.setStrokeStyle(1, 0xffffff, 0.16)
        const edge = this.scene.add.rectangle(-cardWidth / 2 + 1.5, 0, 3, CARD_HEIGHT, accent)

        text.setX(-cardWidth / 2 + PAD_X)
        if (message.player) {
            text.setColor(toCssColor(message.player.c))
        }

        const container = this.scene.add.container(width / 2, height * TOP_RATIO, [background, edge, text])
        container.setAlpha(0)
        this.scene.tweens.add({ targets: container, alpha: 1, duration: FADE_MS })

        this.cards.push({ container, bornAt: this.scene.time.now })
        while (this.cards.length > MAX_STACKED) {
            this.remove(this.cards[0])
        }
        this.layout()
    }

    update() {
        const now = this.scene.time.now
        this.cards.filter((card) => now - card.bornAt > LIFETIME_MS).forEach((card) => this.remove(card))
    }

    clear() {
        ;[...this.cards].forEach((card) => this.remove(card))
    }

    /** Newest at the bottom of the stack, older ones pushed upward */
    private layout() {
        const { width, height } = getGameWindowSize(this.scene)
        const baseY = height * TOP_RATIO
        this.cards.forEach((card, index) => {
            const fromBottom = this.cards.length - 1 - index
            this.scene.tweens.add({
                targets: card.container,
                x: width / 2,
                y: baseY - fromBottom * (CARD_HEIGHT + GAP),
                duration: FADE_MS,
                ease: 'Quad.easeOut',
            })
        })
    }

    private remove(card: Card) {
        this.cards = this.cards.filter((c) => c !== card)
        this.scene.tweens.add({
            targets: card.container,
            alpha: 0,
            duration: FADE_MS,
            onComplete: () => card.container.destroy(true),
        })
        this.layout()
    }

    private format(message: Message): string {
        if (message.isUserMessage) {
            return `${message.player?.n ?? ''}: ${message.content}`
        }
        return message.content
    }
}
