import {Actor} from '../Actor'
import {Player} from '../../Player'
import {Position} from '../Position'
import {Life} from '../Life'
import {UnitsType} from '../../../../common/UNITS'
import {v4 as uuidv4} from 'uuid'
import {UnitAction, UnitActionType} from '../../../../common/UnitAction'
import {Velocity} from '../Velocity'

export abstract class BaseUnit extends Actor {

    public readonly id: string
    public type = UnitsType.Stick
    public life: Life
    private actions: UnitAction[] = []


    protected constructor(owner: Player,
                          position: Position,
                          public readonly damage: number,
                          hp: number,
                          protected velocity: Velocity) {
        super(owner, position)
        this.id = uuidv4()
        this.life = new Life(hp)
    }

    addAction(action: UnitAction) {
        switch (action.type) {
            case UnitActionType.Move:
                // Remove any move action already saved
                this.actions = this.actions.filter(action => action.type !== UnitActionType.Move)
                this.actions.push(action)
                break
            default:
                console.log("addAction: Unit action type not managed", action)
                break
        }
    }

    update() {
        this.actions = this.actions.reduce((acc: UnitAction[], action) => {
            switch (action.type) {
                case UnitActionType.Move:
                    const isDestinationReached = this.position.move(action.data.destination, this.velocity)
                    if(!isDestinationReached) {
                        acc.push(action)
                    }

                    break
                default:
                    console.log("update: Unit action type not managed", action)
                    break
            }
            return acc
        }, [])
    }
}
