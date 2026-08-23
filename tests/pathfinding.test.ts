import { describe, expect, it } from 'vitest'
import { Grid } from 'pathfinding'
import { findTilePath } from '../src/common/pathfinding/findTilePath'
import { gridFromWalkability, serializeGrid, serializeWalkability } from '../src/common/pathfinding/walkabilityGrid'
import { GameMap } from '../src/server/model/map/GameMap'
import { Position } from '../src/server/model/actors/Position'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../src/common/UnitAction'
import { TILE } from './helpers'

/** Non-square grid (width != height) with a vertical wall at x=2 leaving a gap at y=5 */
const makeWalledGrid = () => {
    const width = 6
    const height = 8
    const grid = new Grid(width, height)
    for (let y = 0; y < height; y++) {
        if (y !== 5) {
            grid.setWalkableAt(2, y, false)
        }
    }
    return { grid, width, height }
}

const walkabilityOf = (grid: Grid) => {
    const cells: boolean[] = []
    for (let x = 0; x < grid.width; x++) {
        for (let y = 0; y < grid.height; y++) {
            cells.push(grid.isWalkableAt(x, y))
        }
    }
    return cells
}

describe('walkability snapshot', () => {
    it('rebuilds the exact same grid on a non-square map (no transposition)', () => {
        const { grid, width, height } = makeWalledGrid()

        const rebuilt = gridFromWalkability(serializeGrid(grid))

        expect(rebuilt.width).toBe(width)
        expect(rebuilt.height).toBe(height)
        expect(walkabilityOf(rebuilt)).toEqual(walkabilityOf(grid))
        expect(rebuilt.isWalkableAt(2, 5)).toBe(true)
        expect(rebuilt.isWalkableAt(2, 4)).toBe(false)
        expect(rebuilt.isWalkableAt(4, 2)).toBe(true) // the transposed cell must stay walkable
    })

    it('serializes one string per column, y indexed inside it', () => {
        const snapshot = serializeWalkability(3, 2, (x, y) => !(x === 2 && y === 1))
        expect(snapshot.columns).toEqual(['11', '11', '10'])
    })
})

describe('findTilePath', () => {
    it('goes through the wall gap, identically from the original and the rebuilt grid', () => {
        const { grid } = makeWalledGrid()
        const from = { x: 0, y: 0 }
        const to = { x: 5, y: 0 }

        const serverPath = findTilePath(grid, from, to)
        const clientPath = findTilePath(gridFromWalkability(serializeGrid(grid)), from, to)

        expect(serverPath.length).toBeGreaterThan(0)
        expect(serverPath[0]).toEqual([0, 0])
        expect(serverPath.at(-1)).toEqual([5, 0])
        expect(serverPath).toContainEqual([2, 5])
        expect(clientPath).toEqual(serverPath)
    })

    it('returns an empty path for a blocked destination', () => {
        const { grid } = makeWalledGrid()
        expect(findTilePath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([])
    })

    it('returns an empty path instead of throwing for out of grid coordinates', () => {
        const { grid } = makeWalledGrid()
        expect(findTilePath(grid, { x: 0, y: 0 }, { x: 0, y: 999 })).toEqual([])
        expect(findTilePath(grid, { x: 0, y: 0 }, { x: -1, y: 0 })).toEqual([])
        expect(findTilePath(grid, { x: 99, y: 0 }, { x: 0, y: 0 })).toEqual([])
    })

    it('does not mutate the grid passed in', () => {
        const { grid } = makeWalledGrid()
        const before = walkabilityOf(grid)
        findTilePath(grid, { x: 0, y: 0 }, { x: 5, y: 7 })
        expect(walkabilityOf(grid)).toEqual(before)
    })
})

describe('real map: client preview vs server movement', () => {
    const map = new GameMap()
    const snapshot = map.export().pathfinding
    const clientGrid = gridFromWalkability(snapshot)

    it('exports a snapshot matching the server grid cell by cell', () => {
        expect(snapshot.width).toBe(map.pathFindingGrid.width)
        expect(snapshot.height).toBe(map.pathFindingGrid.height)
        expect(snapshot.width).not.toBe(snapshot.height) // the transposition bug only shows on non-square maps
        expect(walkabilityOf(clientGrid)).toEqual(walkabilityOf(map.pathFindingGrid))
    })

    it('computes the same path between two towns on both sides', () => {
        const towns = map.getTowns()
        const from = towns[0]
        const to = towns[towns.length - 1]

        const action = new UnitAction(
            'unit',
            UnitActionType.Move,
            new UnitActionMoveData(new Position(to.x * TILE + TILE / 2, to.y * TILE + TILE / 2))
        )
        action.calculatePath(new Position(from.x * TILE + TILE / 2, from.y * TILE + TILE / 2), map)

        const clientPath = findTilePath(clientGrid, { x: from.x, y: from.y }, { x: to.x, y: to.y })
        const clientWorldPath = clientPath.slice(1).map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2])

        expect(clientPath.length).toBeGreaterThan(1)
        expect(action.path).toEqual(clientWorldPath)
    })

    it('ignores a destination outside the map instead of crashing the loop', () => {
        const action = new UnitAction(
            'unit',
            UnitActionType.Move,
            new UnitActionMoveData(new Position(0, snapshot.height * TILE * 10))
        )
        expect(() => action.calculatePath(new Position(TILE / 2, TILE / 2), map)).not.toThrow()
        expect(action.path).toEqual([])
    })
})
