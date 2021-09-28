import { Position } from '../server/model/actors/Position'
import { AStarFinder, DiagonalMovement } from 'pathfinding'
import { GameMap } from '../server/model/map/GameMap'
import { TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT_HALF } from './UNITS'

const pathFinder = new AStarFinder({
    diagonalMovement: DiagonalMovement.OnlyWhenNoObstacles,
})

export class UnitAction {
    public path: number[][] | null = null
    public currentPathIndex: number = -1
    public currentPathItem: number[] = []

    constructor(
        public readonly unitId: string,
        public readonly type: UnitActionType,
        public readonly data: UnitActionMoveData
    ) {}

    calculatePath(startPosition: Position, map: GameMap) {
        const dest = this.data.destination.getRounded()
        const startRounded = startPosition.getRounded()
        const originalPath = pathFinder.findPath(
            startRounded.x,
            startRounded.y,
            dest.x,
            dest.y,
            map.pathFindingGrid.clone()
        )

        originalPath.shift()
        this.path = []
        for (const p of originalPath) {
            this.path.push([
                p[0] * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT_HALF,
                p[1] * TILE_WIDTH_HEIGHT + TILE_WIDTH_HEIGHT_HALF,
            ])
        }
    }

    getNextPoint() {
        if (!this.path || this.currentPathIndex >= this.path.length) {
            return null
        }
        return this.currentPathItem
    }

    moveToNextPoint() {
        if (this.path) {
            this.currentPathIndex++
            this.currentPathItem = this.path[this.currentPathIndex]
        }
    }
}

export class UnitActionMoveData {
    constructor(public readonly destination: Position) {}
}

export enum UnitActionType {
    Move,
}
