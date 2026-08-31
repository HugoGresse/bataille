import * as Phaser from 'phaser'
import { BaseScene } from '../BaseScene'
import { PrivateGameState, PublicPlayerState } from '../../../../server/model/GameState'
import { toColorNumber, toCssColor } from '../../utils/colors'
import { isOutOfGame, sortForDisplay } from '../../utils/standingsOrder'
import { crispText, setColorIfChanged } from './crispText'

const LEFT = 12
const TOP = 46
const WIDTH = 186
const ROW_HEIGHT = 19
const HEADER_HEIGHT = 18
const PAD = 8

const PANEL = 0x060a12
const EDGE = 0xffffff
const UP = '#35d07f'
const DOWN = '#f2635f'
const FLAT = '#8a99b3'
/** Dropped connection: a state you should notice, and one that may yet reverse */
const OFFLINE = '#f0b429'
const OFFLINE_TINT = 0xf0b429

type Row = {
    swatch: Phaser.GameObjects.Rectangle
    name: Phaser.GameObjects.Text
    value: Phaser.GameObjects.Text
    delta: Phaser.GameObjects.Text
    highlight: Phaser.GameObjects.Rectangle
    strike: Phaser.GameObjects.Rectangle
    offlineWash: Phaser.GameObjects.Rectangle
    offlineEdge: Phaser.GameObjects.Rectangle
}

/**
 * Who is ahead, and which way they are moving. Position is the ranking, so the numbered prefix is
 * gone; the delta since the last income tick is the part you actually act on.
 */
export class Standings {
    private panel: Phaser.GameObjects.Rectangle
    private header: Phaser.GameObjects.Text
    private rows: Row[] = []
    private baseline = new Map<string, number>()
    private lastCountdown = -1
    private lastPainted: PrivateGameState | null = null

    constructor(private scene: BaseScene) {
        this.panel = scene.add.rectangle(LEFT, TOP, WIDTH, HEADER_HEIGHT, PANEL, 0.74)
        this.panel.setOrigin(0, 0)
        this.panel.setStrokeStyle(1, EDGE, 0.16)

        this.header = crispText(scene, LEFT + PAD, TOP + 4, 'STANDINGS', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '9px',
            color: '#ffffff',
        })
        this.header.setAlpha(0.52)
    }

    update(scene: BaseScene) {
        const state = scene.getState()
        const players = state?.ps
        if (!players?.length) {
            return
        }
        // The socket hands back the same object until a new server tick lands (~10Hz), so most of
        // the 60+ frames per second have nothing to repaint
        if (state === this.lastPainted) {
            return
        }
        this.lastPainted = state

        this.refreshBaseline(players, state?.ni ?? 0)
        const ordered = sortForDisplay(players)
        this.panel.height = HEADER_HEIGHT + ordered.length * ROW_HEIGHT + 4

        ordered.forEach((player, index) => {
            const row = this.rows[index] ?? this.buildRow(index)
            this.paintRow(row, player, state?.cp.n)
        })
        for (let index = ordered.length; index < this.rows.length; index++) {
            this.hideRow(this.rows[index])
        }
    }

    destroy() {
        this.rows.forEach((row) => {
            row.swatch.destroy()
            row.name.destroy()
            row.value.destroy()
            row.delta.destroy()
            row.highlight.destroy()
            row.strike.destroy()
            row.offlineWash.destroy()
            row.offlineEdge.destroy()
        })
        this.rows = []
        this.panel.destroy()
        this.header.destroy()
    }

    /**
     * The delta covers one income cycle. The countdown to the next income runs down and jumps back
     * up on every tick, so a rise in it marks the cycle boundary exactly.
     */
    private refreshBaseline(players: PublicPlayerState[], countdown: number) {
        const ticked = this.lastCountdown < 0 || countdown > this.lastCountdown
        this.lastCountdown = countdown
        if (ticked) {
            players.forEach((player) => this.baseline.set(player.n, player.i))
        }
    }

    private buildRow(index: number): Row {
        const y = TOP + HEADER_HEIGHT + index * ROW_HEIGHT
        const scene = this.scene

        const highlight = scene.add.rectangle(LEFT, y, WIDTH, ROW_HEIGHT, EDGE, 0.09)
        highlight.setOrigin(0, 0)
        highlight.setVisible(false)

        // A dropped player gets their own colour across the whole row, so the state is caught at a
        // glance rather than inferred from a slightly dimmer name
        const offlineWash = scene.add.rectangle(LEFT, y, WIDTH, ROW_HEIGHT, OFFLINE_TINT, 0.14)
        offlineWash.setOrigin(0, 0)
        offlineWash.setVisible(false)

        const offlineEdge = scene.add.rectangle(LEFT, y, 3, ROW_HEIGHT, OFFLINE_TINT)
        offlineEdge.setOrigin(0, 0)
        offlineEdge.setVisible(false)

        const swatch = scene.add.rectangle(LEFT + PAD, y + 3, 3, ROW_HEIGHT - 6, 0xffffff)
        swatch.setOrigin(0, 0)

        const name = crispText(scene, LEFT + PAD + 9, y + 3, '', {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '11px',
            color: '#ffffff',
        })
        const value = crispText(scene, LEFT + WIDTH - PAD - 34, y + 3, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            color: '#ffffff',
        })
        value.setOrigin(1, 0)
        const delta = crispText(scene, LEFT + WIDTH - PAD, y + 4, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '10px',
            color: FLAT,
        })
        delta.setOrigin(1, 0)

        const strike = scene.add.rectangle(LEFT + PAD + 9, y + 9, 0, 1, 0xffffff, 0.75)
        strike.setOrigin(0, 0)
        strike.setVisible(false)

        const row: Row = { swatch, name, value, delta, highlight, strike, offlineWash, offlineEdge }
        this.rows[index] = row
        return row
    }

    private paintRow(row: Row, player: PublicPlayerState, currentPlayerName: string | undefined) {
        const out = isOutOfGame(player)
        // Being gone for good and having merely dropped out are different states and read differently
        const offline = !out && !player.cnt
        const alpha = out ? 0.42 : 1
        const isMe = player.n === currentPlayerName

        row.swatch
            .setVisible(true)
            .setFillStyle(toColorNumber(player.c))
            .setAlpha(out ? alpha : 1)
        row.name.setVisible(true).setText(player.n).setAlpha(alpha)
        row.value.setVisible(true).setText(`${player.i}`).setAlpha(alpha)
        row.highlight.setVisible(isMe && !offline)
        row.offlineWash.setVisible(offline)
        row.offlineEdge.setVisible(offline)

        // A struck name for elimination: state belongs to the row, not to a glyph appended to a string
        row.strike.setVisible(out)
        if (out) {
            row.strike.width = row.name.width
        }

        const change = player.i - (this.baseline.get(player.n) ?? player.i)
        // The delta slot carries the offline state: whatever their income was doing stopped mattering
        const delta = out
            ? { text: '-', color: FLAT, alpha }
            : offline
              ? { text: 'OFF', color: OFFLINE, alpha: 1 }
              : change > 0
                ? { text: `+${change}`, color: UP, alpha: 1 }
                : change < 0
                  ? { text: `${change}`, color: DOWN, alpha: 1 }
                  : { text: '0', color: FLAT, alpha: 0.5 }
        row.delta.setText(delta.text).setAlpha(delta.alpha)
        setColorIfChanged(row.delta, delta.color)

        setColorIfChanged(row.name, offline ? OFFLINE : isMe ? '#ffffff' : toCssColor(player.c))
    }

    private hideRow(row: Row) {
        row.swatch.setVisible(false)
        row.name.setVisible(false)
        row.value.setVisible(false)
        row.delta.setVisible(false)
        row.highlight.setVisible(false)
        row.strike.setVisible(false)
        row.offlineWash.setVisible(false)
        row.offlineEdge.setVisible(false)
    }
}
