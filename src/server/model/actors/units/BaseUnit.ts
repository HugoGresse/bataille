import {Actor} from '../Actor'
import {Player} from '../../Player'
import {Position} from '../Position'
import {Life} from '../Life'
import {UnitsType} from '../../../../constants/UNITS'

export abstract class BaseUnit extends Actor {

    public type = UnitsType.Stick
    public life: Life

    protected constructor(owner: Player, position: Position, protected damage: number, hp: number) {
        super(owner, position);
        this.life = new Life(hp)
    }


}
