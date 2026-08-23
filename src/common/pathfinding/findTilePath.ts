import { AStarFinder, DiagonalMovement, Grid } from 'pathfinding'

export type TileCoord = { x: number; y: number }

/**
 * Single A* configuration shared by the server (unit movement) and the client (path preview):
 * both sides must always compute the exact same path for a given grid.
 */
const pathFinder = new AStarFinder({
    diagonalMovement: DiagonalMovement.OnlyWhenNoObstacles,
})

/**
 * Tile path from `from` to `to` (both included), or an empty array when `to` cannot be reached.
 * Coordinates outside the grid are rejected instead of crashing the finder (the destination comes
 * straight from the client), and a blocked destination short-circuits the whole-grid exploration
 * A* would otherwise do before giving up.
 */
export const findTilePath = (grid: Grid, from: TileCoord, to: TileCoord): number[][] => {
    if (!grid.isInside(from.x, from.y) || !grid.isInside(to.x, to.y) || !grid.isWalkableAt(to.x, to.y)) {
        return []
    }
    return pathFinder.findPath(from.x, from.y, to.x, to.y, grid.clone())
}

export const isSameTile = (a: TileCoord, b: TileCoord): boolean => a.x === b.x && a.y === b.y
