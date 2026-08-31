import * as Phaser from 'phaser'
import { UIScene } from './UIScene'
import { Message } from '../../../../server/model/types/Message'
import { getGameWindowSize } from '../../../utils/getGameWindowSize'
import { feedLine, stamp } from './notices'
import { toCssColor } from '../../utils/colors'
import { crispText } from './crispText'
import { hudFont, hudPx } from './hudScale'

const WIDTH = hudPx(224)
const MARGIN = 10
const HEADER_HEIGHT = hudPx(20)
const LINE_HEIGHT = hudPx(15)
const MAX_LINES = 6
const PAD = hudPx(8)
const TIME_COLUMN = hudPx(34)
const ACTOR_GAP = hudPx(4)
/** Two captures by the same player inside this window fold into one line */
const FOLD_MS = 6000
const MOBILE_MAX_WIDTH = 768
const STORAGE_KEY = 'bataille.feed.open'

type Entry = {
    actor: string
    color: string
    text: string
    at: number
    count: number
}

/**
 * Everyone else's business, folded into a corner. Nothing pops for it on the board beyond the
 * ripple where it happened. Collapsible on desktop, collapsed by default on mobile.
 */
export class NoticeFeed {
    private entries: Entry[] = []
    private unread = 0
    private open: boolean
    private startedAt = Date.now()

    private panel: Phaser.GameObjects.Rectangle
    private headerZone: Phaser.GameObjects.Rectangle
    private title: Phaser.GameObjects.Text
    private badge: Phaser.GameObjects.Text
    private caret: Phaser.GameObjects.Text
    private lines: { time: Phaser.GameObjects.Text; actor: Phaser.GameObjects.Text; text: Phaser.GameObjects.Text }[] =
        []

    constructor(private scene: UIScene) {
        this.open = readStoredOpen(isMobile(scene))

        this.panel = scene.add.rectangle(0, 0, WIDTH, HEADER_HEIGHT, 0x060a12, 0.74)
        this.panel.setOrigin(0, 0)
        this.panel.setStrokeStyle(1, 0xffffff, 0.16)

        this.title = crispText(scene, 0, 0, 'ELSEWHERE', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: hudFont(9),
            color: '#ffffff',
        })
        this.title.setAlpha(0.8)

        this.badge = crispText(scene, 0, 0, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: hudFont(9),
            color: '#17120a',
            backgroundColor: '#ffd54f',
        })
        this.badge.setPadding(hudPx(4), 1, hudPx(4), 1)

        this.caret = crispText(scene, 0, 0, 'v', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: hudFont(9),
            color: '#ffffff',
        })
        this.caret.setAlpha(0.6)

        this.headerZone = scene.add.rectangle(0, 0, WIDTH, HEADER_HEIGHT, 0xffffff, 0.001)
        this.headerZone.setOrigin(0, 0)
        this.headerZone.setInteractive({ useHandCursor: true })
        this.headerZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) =>
            this.scene.markUIPointer(pointer)
        )
        this.headerZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.toggle())

        this.layout()
    }

    add(message: Message) {
        const { actor, text } = feedLine(message)
        const color = toCssColor(message.player?.c, '#ffffff')
        const now = Date.now()

        const last = this.entries[this.entries.length - 1]
        if (last && last.actor === actor && now - last.at < FOLD_MS && text.startsWith('took')) {
            last.count += 1
            last.text = `+${last.count} countries`
            last.at = now
        } else {
            this.entries.push({ actor, color, text, at: now, count: 1 })
            if (this.entries.length > MAX_LINES) {
                this.entries.shift()
            }
        }

        if (!this.open) {
            this.unread += 1
        }
        this.layout()
    }

    toggle() {
        this.open = !this.open
        if (this.open) {
            this.unread = 0
        }
        writeStoredOpen(this.open)
        this.layout()
    }

    destroy() {
        this.lines.forEach((line) => {
            line.time.destroy()
            line.actor.destroy()
            line.text.destroy()
        })
        this.lines = []
        this.panel.destroy()
        this.headerZone.destroy()
        this.title.destroy()
        this.badge.destroy()
        this.caret.destroy()
    }

    /** Anchored bottom right, growing upward when open */
    layout() {
        const { width, height } = getGameWindowSize(this.scene)
        const visibleLines = this.open ? this.entries.length : 0
        const panelHeight = HEADER_HEIGHT + (visibleLines ? visibleLines * LINE_HEIGHT + hudPx(6) : 0)
        const left = width - MARGIN - WIDTH
        const top = height - MARGIN - panelHeight

        this.panel.setPosition(left, top)
        this.panel.height = panelHeight
        this.headerZone.setPosition(left, top)

        this.title.setPosition(left + PAD, top + hudPx(6))
        this.caret.setPosition(left + WIDTH - PAD - hudPx(6), top + hudPx(6))
        this.caret.setText(this.open ? 'v' : '^')

        this.badge.setVisible(this.unread > 0 && !this.open)
        this.badge.setText(`${this.unread}`)
        this.badge.setPosition(left + WIDTH - PAD - hudPx(22) - this.badge.width, top + hudPx(5))

        this.entries.forEach((entry, index) => {
            const line = this.lines[index] ?? this.buildLine(index)
            const y = top + HEADER_HEIGHT + hudPx(3) + index * LINE_HEIGHT
            line.time
                .setPosition(left + PAD, y)
                .setText(stamp(entry.at - this.startedAt))
                .setVisible(this.open)
            line.actor
                .setPosition(left + PAD + TIME_COLUMN, y)
                .setText(entry.actor)
                .setColor(entry.color)
                .setVisible(this.open)
            line.text
                .setPosition(left + PAD + TIME_COLUMN + ACTOR_GAP + line.actor.width, y)
                .setText(entry.text)
                .setVisible(this.open)
        })
        for (let index = this.entries.length; index < this.lines.length; index++) {
            this.lines[index].time.setVisible(false)
            this.lines[index].actor.setVisible(false)
            this.lines[index].text.setVisible(false)
        }
    }

    private buildLine(index: number) {
        const style = {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: hudFont(9),
            color: '#ffffff',
        }
        const time = crispText(this.scene, 0, 0, '', style)
        time.setAlpha(0.42)
        const actor = crispText(this.scene, 0, 0, '', style)
        const text = crispText(this.scene, 0, 0, '', style)
        text.setAlpha(0.85)
        const line = { time, actor, text }
        this.lines[index] = line
        return line
    }
}

const isMobile = (scene: Phaser.Scene): boolean => {
    const { width } = getGameWindowSize(scene)
    return width < MOBILE_MAX_WIDTH
}

const readStoredOpen = (mobile: boolean): boolean => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored === 'true' || stored === 'false') {
            return stored === 'true'
        }
    } catch {
        // private browsing, fall through to the default
    }
    return !mobile
}

const writeStoredOpen = (open: boolean) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(open))
    } catch {
        // nothing to do, the choice just will not survive a reload
    }
}
