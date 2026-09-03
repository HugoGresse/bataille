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
 * Which of two tiles A* starts from, so that a pair of tiles is always searched the same way round.
 */
const isCanonicalOrder = (from: TileCoord, to: TileCoord): boolean =>
    from.x < to.x || (from.x === to.x && from.y <= to.y)

/**
 * Tile path from `from` to `to` (both included), or an empty array when `to` cannot be reached.
 * Coordinates outside the grid are rejected instead of crashing the finder (the destination comes
 * straight from the client), and a blocked destination short-circuits the whole-grid exploration
 * A* would otherwise do before giving up.
 *
 * Between two tiles on open ground there are many equally short staircases, and A* picks whichever
 * its search order reaches first: asking for A to B and for B to A returned lines a tile apart, so
 * two stacks swapping towns walked past each other instead of meeting. The search therefore always
 * runs in the same direction for a given pair, and the result is reversed when the caller asked for
 * the other way round. The walkability rules are symmetric - a diagonal step tests the same two
 * orthogonal neighbours whichever end it is taken from - so the reversed line is just as legal.
 */
export const findTilePath = (grid: Grid, from: TileCoord, to: TileCoord): number[][] => {
    if (!grid.isInside(from.x, from.y) || !grid.isInside(to.x, to.y) || !grid.isWalkableAt(to.x, to.y)) {
        return []
    }
    // A* tolerates starting on a blocked tile but never steps onto one, so a stack standing somewhere
    // unwalkable keeps its own direction rather than losing its path to the swap.
    const swap = grid.isWalkableAt(from.x, from.y) && !isCanonicalOrder(from, to)
    const [start, end] = swap ? [to, from] : [from, to]
    const path = pathFinder.findPath(start.x, start.y, end.x, end.y, grid.clone())
    return swap ? path.reverse() : path
}

export const isSameTile = (a: TileCoord, b: TileCoord): boolean => a.x === b.x && a.y === b.y
