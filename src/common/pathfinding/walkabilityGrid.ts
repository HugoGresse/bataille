import { Grid } from 'pathfinding'

/**
 * Compact walkability snapshot of the server pathfinding grid, sent to the client so it can
 * preview paths with the exact same grid. One string per column, '1' = walkable.
 */
export type WalkabilitySnapshot = {
    width: number
    height: number
    columns: string[]
}

const WALKABLE = '1'
const BLOCKED = '0'

export const serializeWalkability = (
    width: number,
    height: number,
    isWalkable: (x: number, y: number) => boolean
): WalkabilitySnapshot => {
    const columns: string[] = []
    for (let x = 0; x < width; x++) {
        let column = ''
        for (let y = 0; y < height; y++) {
            column += isWalkable(x, y) ? WALKABLE : BLOCKED
        }
        columns.push(column)
    }
    return { width, height, columns }
}

export const gridFromWalkability = ({ width, height, columns }: WalkabilitySnapshot): Grid => {
    // Built cell by cell on purpose: the `Grid(matrix)` constructor expects rows first (matrix[y][x]),
    // an easy trap when the rest of the code base is column first (tiles[x][y]).
    const grid = new Grid(width, height)
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            grid.setWalkableAt(x, y, columns[x]?.[y] === WALKABLE)
        }
    }
    return grid
}

export const serializeGrid = (grid: Grid): WalkabilitySnapshot =>
    serializeWalkability(grid.width, grid.height, (x, y) => grid.isWalkableAt(x, y))
