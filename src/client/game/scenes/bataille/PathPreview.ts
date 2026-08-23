import * as Phaser from 'phaser'
import { Grid } from 'pathfinding'
import { TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT_HALF } from '../../../../common/UNITS'
import { findTilePath, isSameTile, TileCoord } from '../../../../common/pathfinding/findTilePath'
import { DEPTH_UNIT } from '../depth'

const LINE_COLOR = 0xffffff
const LINE_ALPHA = 0.65
const REACHABLE_COLOR = 0x00e676
const UNREACHABLE_COLOR = 0xff5252

export type PathPreviewOrigin = {
    /** Where the polyline starts: the sprite (possibly mid-tween) position */
    worldX: number
    worldY: number
    /** Tile the server knows the stack at: the A* start, like the server does */
    tile: TileCoord
}

/**
 * While a stack is selected (two-step move UX), draws the A* path from the stack to the
 * hovered tile using the same walkability grid + algorithm as the server, and highlights
 * the destination cell (green = reachable, red = unreachable).
 */
export class PathPreview {
    private graphics: Phaser.GameObjects.Graphics
    private lastFromTile: TileCoord | null = null
    private lastToTile: TileCoord | null = null

    constructor(
        private scene: Phaser.Scene,
        private grid: Grid
    ) {
        this.graphics = scene.add.graphics()
        this.graphics.setDepth(DEPTH_UNIT + 1)
    }

    /**
     * Redraws only when the origin tile or the hovered tile changed (pointer moves are frequent)
     */
    update(from: PathPreviewOrigin, toTile: TileCoord) {
        if (
            this.lastFromTile &&
            this.lastToTile &&
            isSameTile(this.lastFromTile, from.tile) &&
            isSameTile(this.lastToTile, toTile)
        ) {
            return
        }
        this.lastFromTile = { ...from.tile }
        this.lastToTile = { ...toTile }
        this.draw(from, toTile)
    }

    /** Re-run the preview toward the last hovered tile, eg. because the selected stack moved */
    refresh(from: PathPreviewOrigin) {
        if (this.lastToTile) {
            this.update(from, this.lastToTile)
        }
    }

    clear() {
        this.lastFromTile = null
        this.lastToTile = null
        this.graphics.clear()
    }

    destroy() {
        this.graphics.destroy()
    }

    private draw(from: PathPreviewOrigin, toTile: TileCoord) {
        const g = this.graphics
        g.clear()

        if (isSameTile(from.tile, toTile)) {
            return // clicking the origin tile cancels the selection: nothing to preview
        }

        const path = findTilePath(this.grid, from.tile, toTile)
        const reachable = path.length > 0

        this.drawDestinationCell(toTile, reachable)
        if (reachable) {
            this.drawPath(from, path)
        }
    }

    private drawDestinationCell(tile: TileCoord, reachable: boolean) {
        const g = this.graphics
        const color = reachable ? REACHABLE_COLOR : UNREACHABLE_COLOR
        const x = tile.x * TILE_WIDTH_HEIGHT
        const y = tile.y * TILE_WIDTH_HEIGHT
        g.fillStyle(color, 0.18)
        g.fillRect(x, y, TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT)
        g.lineStyle(2, color, 0.9)
        g.strokeRect(x, y, TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT)
    }

    /** Polyline through the tile centers (the path includes the start tile, skipped: the line starts at the sprite) */
    private drawPath(from: PathPreviewOrigin, path: number[][]) {
        const g = this.graphics
        const points: number[] = [from.worldX, from.worldY]
        for (const [x, y] of path.slice(1)) {
            points.push(x * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT_HALF, y * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT_HALF)
        }
        g.lineStyle(3, LINE_COLOR, LINE_ALPHA)
        g.beginPath()
        g.moveTo(points[0], points[1])
        for (let i = 2; i < points.length; i += 2) {
            g.lineTo(points[i], points[i + 1])
        }
        g.strokePath()

        // waypoint dots (not on the destination cell, already highlighted)
        g.fillStyle(LINE_COLOR, 0.9)
        for (let i = 2; i < points.length - 2; i += 2) {
            g.fillCircle(points[i], points[i + 1], 2)
        }
    }
}
