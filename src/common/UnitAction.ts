import { Position } from '../server/model/actors/Position'
import { AStarFinder } from 'pathfinding'
import { GameMap } from '../server/model/map/GameMap'

export class UnitAction {
    public path: number[][] | null = null

    constructor(
        public readonly unitId: string,
        public readonly type: UnitActionType,
        public readonly data: UnitActionMoveData
    ) {}

    calculatePath(startPosition: Position, map: GameMap) {
        const dest = this.data.destination.getRounded()
        const startRounded = startPosition.getRounded()
        this.path = new AStarFinder().findPath(startRounded.x, startRounded.y, dest.x, dest.y, map.pathFindingGrid)

        console.log('path', this.path)
    }
}

export class UnitActionMoveData {
    constructor(public readonly destination: Position) {}
}

export enum UnitActionType {
    Move,
}
