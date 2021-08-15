import { Position } from '../server/model/actors/Position'

export class UnitAction {
    constructor(
        public readonly unitId: string,
        public readonly type: UnitActionType,
        public readonly data: UnitActionMoveData
    ) {}
}

export class UnitActionMoveData {
    constructor(public readonly destination: Position) {}
}

export enum UnitActionType {
    Move,
}
