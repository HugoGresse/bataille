import { BaseUnit } from './BaseUnit'
import { Position } from '../Position'
import { Velocity } from '../Velocity'
import { AbstractPlayer } from '../../player/AbstractPlayer'

const BASE_HP = 1
const BASE_DAMAGE = 1

export class StickUnit extends BaseUnit {
    constructor(owner: AbstractPlayer, position: Position, hp: number = BASE_HP) {
        super(owner, position, BASE_DAMAGE, hp, new Velocity(6))
    }

    public spawnCopy(hp: number): BaseUnit {
        const { x, y } = this.position.get()
        return new StickUnit(this.owner, new Position(x, y), hp)
    }
}
