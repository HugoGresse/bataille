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

/** Every step lands on a walkable neighbour, and a diagonal never cuts a blocked corner */
const assertLegalPath = (grid: Grid, path: number[][]) => {
    for (const [x, y] of path) {
        expect(grid.isWalkableAt(x, y)).toBe(true)
    }
    for (let index = 1; index < path.length; index++) {
        const [previousX, previousY] = path[index - 1]
        const [x, y] = path[index]
        const stepX = x - previousX
        const stepY = y - previousY
        expect(Math.max(Math.abs(stepX), Math.abs(stepY))).toBe(1)
        if (stepX !== 0 && stepY !== 0) {
            expect(grid.isWalkableAt(previousX + stepX, previousY)).toBe(true)
            expect(grid.isWalkableAt(previousX, previousY + stepY)).toBe(true)
        }
    }
}

describe('findTilePath is the same line both ways', () => {
    /** Two stacks swapping towns have to meet: the way back must retrace the way there */
    const expectSymmetric = (grid: Grid, from: { x: number; y: number }, to: { x: number; y: number }) => {
        const there = findTilePath(grid, from, to)
        const back = findTilePath(grid, to, from)

        expect(there.length).toBeGreaterThan(1)
        expect(there[0]).toEqual([from.x, from.y])
        expect(there.at(-1)).toEqual([to.x, to.y])
        expect(back[0]).toEqual([to.x, to.y])
        expect(back.at(-1)).toEqual([from.x, from.y])
        expect([...back].reverse()).toEqual(there)
        assertLegalPath(grid, there)
        assertLegalPath(grid, back)
    }

    it('retraces diagonal crossings on open ground, whichever corner starts', () => {
        const grid = new Grid(20, 20)
        // The reported case: a diagonal run between two towns, where A* used to answer with two
        // staircases a tile apart depending on the direction asked for
        expectSymmetric(grid, { x: 2, y: 2 }, { x: 9, y: 6 })
        expectSymmetric(grid, { x: 3, y: 10 }, { x: 12, y: 4 })
        expectSymmetric(grid, { x: 1, y: 8 }, { x: 14, y: 3 })
        expectSymmetric(grid, { x: 14, y: 3 }, { x: 1, y: 8 })
    })

    it('retraces the way back around obstacles too', () => {
        const { grid } = makeWalledGrid()
        expectSymmetric(grid, { x: 0, y: 0 }, { x: 5, y: 0 })
        expectSymmetric(grid, { x: 1, y: 7 }, { x: 4, y: 1 })
    })

    it('holds for every pair on a grid scattered with blocks', () => {
        const grid = new Grid(14, 14)
        for (const [x, y] of [
            [4, 4],
            [4, 5],
            [4, 6],
            [7, 2],
            [7, 3],
            [9, 8],
            [10, 8],
            [11, 8],
            [2, 11],
        ]) {
            grid.setWalkableAt(x, y, false)
        }
        const corners = [
            { x: 0, y: 0 },
            { x: 13, y: 0 },
            { x: 0, y: 13 },
            { x: 13, y: 13 },
            { x: 6, y: 9 },
            { x: 10, y: 5 },
        ]
        for (const from of corners) {
            for (const to of corners) {
                if (!(from.x === to.x && from.y === to.y)) {
                    expectSymmetric(grid, from, to)
                }
            }
        }
    })

    it('still finds a way out for a stack standing on a blocked tile', () => {
        const { grid } = makeWalledGrid()
        // x=2 is walled except at y=5: a stack sitting in the wall can still walk out
        const path = findTilePath(grid, { x: 2, y: 0 }, { x: 0, y: 0 })
        expect(path[0]).toEqual([2, 0])
        expect(path.at(-1)).toEqual([0, 0])
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

    it('walks the same line between two towns whichever one the stack starts from', () => {
        const towns = map.getTowns()
        // Pairs far enough apart to need a long diagonal run, which is where the two directions
        // used to disagree
        const pairs: [(typeof towns)[number], (typeof towns)[number]][] = [
            [towns[0], towns[towns.length - 1]],
            [towns[3], towns[Math.floor(towns.length / 2)]],
            [towns[Math.floor(towns.length / 3)], towns[Math.floor((2 * towns.length) / 3)]],
        ]

        for (const [a, b] of pairs) {
            const there = findTilePath(clientGrid, { x: a.x, y: a.y }, { x: b.x, y: b.y })
            const back = findTilePath(clientGrid, { x: b.x, y: b.y }, { x: a.x, y: a.y })

            expect(there.length).toBeGreaterThan(1)
            expect([...back].reverse()).toEqual(there)
        }
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
