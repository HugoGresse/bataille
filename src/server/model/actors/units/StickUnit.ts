import { BaseUnit } from './BaseUnit'
import { Position } from '../Position'
import { Velocity } from '../Velocity'
import { AbstractPlayer } from '../../player/AbstractPlayer'

const BASE_HP = 1
const BASE_DAMAGE = 1

export class StickUnit extends BaseUnit {
    constructor(owner: AbstractPlayer, position: Position) {
        super(owner, position, BASE_DAMAGE, BASE_HP, new Velocity(6))
    }
}
