import { AStarFinder, DiagonalMovement } from 'pathfinding'
import * as Phaser from 'phaser'
import { TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { DEPTH_UNIT } from '../depth'

const LINE_COLOR = 0xffffff
const LINE_ALPHA = 0.65
const REACHABLE_COLOR = 0x00e676
const UNREACHABLE_COLOR = 0xff5252

const pathFinder = new AStarFinder({
    diagonalMovement: DiagonalMovement.OnlyWhenNoObstacles,
})

/**
 * While a stack is selected (two-step move UX), draws the A* path from the stack to the
 * hovered tile using the same walkability grid + algorithm as the server, and highlights
 * the destination cell (green = reachable, red = unreachable).
 */
export class PathPreview {
    private graphics: Phaser.GameObjects.Graphics
    private lastTile: { x: number; y: number } | null = null

    constructor(
        private scene: Phaser.Scene,
        private grid: import('pathfinding').Grid
    ) {
        this.graphics = scene.add.graphics()
        this.graphics.setDepth(DEPTH_UNIT + 1)
    }

    update(fromWorldX: number, fromWorldY: number, toTile: { x: number; y: number }) {
        if (this.lastTile && this.lastTile.x === toTile.x && this.lastTile.y === toTile.y) {
            return
        }
        this.lastTile = { ...toTile }
        this.draw(fromWorldX, fromWorldY, toTile)
    }

    clear() {
        this.lastTile = null
        this.graphics.clear()
    }

    destroy() {
        this.graphics.destroy()
    }

    private draw(fromWorldX: number, fromWorldY: number, toTile: { x: number; y: number }) {
        const g = this.graphics
        g.clear()

        const fromTileX = Math.floor(fromWorldX / TILE_WIDTH_HEIGHT)
        const fromTileY = Math.floor(fromWorldY / TILE_WIDTH_HEIGHT)

        const cellRect = new Phaser.Geom.Rectangle(
            toTile.x * TILE_WIDTH_HEIGHT,
            toTile.y * TILE_WIDTH_HEIGHT,
            TILE_WIDTH_HEIGHT,
            TILE_WIDTH_HEIGHT
        )

        let path: number[][] = []
        try {
            const gridClone = this.grid.clone()
            // start & destination must be walkable for the finder
            if (
                gridClone.isWalkableAt(fromTileX, fromTileY) &&
                gridClone.isWalkableAt(toTile.x, toTile.y) &&
                !(fromTileX === toTile.x && fromTileY === toTile.y)
            ) {
                path = pathFinder.findPath(fromTileX, fromTileY, toTile.x, toTile.y, gridClone)
            }
        } catch {
            path = []
        }
        const reachable = path.length > 0

        // destination cell highlight
        g.fillStyle(reachable ? REACHABLE_COLOR : UNREACHABLE_COLOR, 0.18)
        g.fillRect(cellRect.x, cellRect.y, cellRect.width, cellRect.height)
        g.lineStyle(2, reachable ? REACHABLE_COLOR : UNREACHABLE_COLOR, 0.9)
        g.strokeRect(cellRect.x, cellRect.y, cellRect.width, cellRect.height)

        if (!reachable) {
            return
        }

        // path polyline (tile centers), starting from the unit's current position
        const points: number[] = [fromWorldX, fromWorldY]
        for (const [x, y] of path) {
            points.push(x * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2, y * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT / 2)
        }
        g.lineStyle(3, LINE_COLOR, LINE_ALPHA)
        g.beginPath()
        g.moveTo(points[0], points[1])
        for (let i = 2; i < points.length; i += 2) {
            g.lineTo(points[i], points[i + 1])
        }
        g.strokePath()

        // waypoint dots
        g.fillStyle(LINE_COLOR, 0.9)
        for (let i = 2; i < points.length - 2; i += 2) {
            g.fillCircle(points[i], points[i + 1], 2)
        }
    }
}
