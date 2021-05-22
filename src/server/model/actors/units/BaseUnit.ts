import {Actor} from '../Actor'
import {Player} from '../../Player'
import {Position} from '../Position'
import {Life} from '../Life'
import {UnitsType} from '../../../../constants/UNITS'
import { v4 as uuidv4 } from 'uuid'

export abstract class BaseUnit extends Actor {

    public readonly id: string
    public type = UnitsType.Stick
    public life: Life

    protected constructor(owner: Player, position: Position, protected damage: number, hp: number) {
        super(owner, position);
        this.id = uuidv4()
        this.life = new Life(hp)
    }


}
