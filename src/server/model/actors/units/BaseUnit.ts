import { Actor } from '../Actor'
import { Position } from '../Position'
import { Life } from '../Life'
import { UnitsType } from '../../../../common/UNITS'
import { v4 as uuidv4 } from 'uuid'
import { UnitAction, UnitActionType } from '../../../../common/UnitAction'
import { Velocity } from '../Velocity'
import { Map } from '../../map/Map'
import { AbstractPlayer } from '../../player/AbstractPlayer'
import { UnitState } from '../../GameState'

export abstract class BaseUnit extends Actor {
    public readonly id: string
    public type = UnitsType.Stick
    public life: Life
    private actions: UnitAction[] = []
    private postponedAction: boolean = false

    protected constructor(
        owner: AbstractPlayer,
        position: Position,
        public readonly damage: number,
        hp: number,
        protected velocity: Velocity
    ) {
        super(owner, position)
        this.id = uuidv4()
        this.life = new Life(hp)
    }

    addAction(action: UnitAction) {
        switch (action.type) {
            case UnitActionType.Move:
                // Remove any move action already saved
                this.actions = this.actions.filter((action) => action.type !== UnitActionType.Move)
                this.actions.push(action)
                break
            default:
                console.log('addAction: Unit action type not managed', action)
                break
        }
    }

    postponeAction() {
        this.postponedAction = true
    }

    update(map: Map): boolean {
        if (this.actions.length === 0) {
            return false
        }
        if (this.postponedAction) {
            this.postponedAction = false
            return false
        }
        const currentSpeed = this.velocity.modulate(this.position, map)
        this.actions = this.actions.reduce((acc: UnitAction[], action) => {
            switch (action.type) {
                case UnitActionType.Move:
                    const isDestinationReached = this.position.move(action.data.destination, currentSpeed)
                    if (!isDestinationReached) {
                        acc.push(action)
                    }

                    break
                default:
                    console.log('update: Unit action type not managed', action)
                    break
            }
            return acc
        }, [])
        return true
    }

    getPublicState(): UnitState {
        return {
            id: this.id,
            type: this.type,
            hp: this.life.get(),
            position: this.position.get(),
            color: this.owner.color.replace('0x', '#'),
        }
    }
}
