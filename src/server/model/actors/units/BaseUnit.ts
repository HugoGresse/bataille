import { Actor } from '../Actor'
import { Position } from '../Position'
import { Life } from '../Life'
import { UnitsType } from '../../../../common/UNITS'
import { v4 as uuidv4 } from 'uuid'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../../../../common/UnitAction'
import { Velocity } from '../Velocity'
import { GameMap } from '../../map/GameMap'
import { AbstractPlayer } from '../../player/AbstractPlayer'
import { UnitState } from '../../GameState'

export abstract class BaseUnit extends Actor {
    public readonly id: string
    public type = UnitsType.Stick
    public life: Life
    private actions: UnitAction[] = []
    private postponedAction: boolean = false
    public forceUpdate: boolean = true

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
                this.actions.push(
                    new UnitAction(
                        action.unitId,
                        action.type,
                        new UnitActionMoveData(new Position(action.data.destination.x, action.data.destination.y))
                    )
                )
                break
            default:
                console.log('addAction: Unit action type not managed', action)
                break
        }
    }

    postponeAction() {
        this.postponedAction = true
    }

    update(map: GameMap): boolean {
        if (this.forceUpdate) {
            this.forceUpdate = false
            return true
        }
        if (this.actions.length === 0) {
            return false
        }
        if (this.postponedAction) {
            this.postponedAction = false
            return false
        }
        this.actions = this.actions.reduce((acc: UnitAction[], action) => {
            switch (action.type) {
                case UnitActionType.Move:
                    if (!action.path) {
                        action.calculatePath(this.position, map)
                        action.moveToNextPoint()
                    }

                    const nextPoint = action.getNextPoint()
                    if (nextPoint) {
                        const moved = this.position.move(nextPoint, this.velocity, map)

                        if (moved) {
                            action.moveToNextPoint()
                        }

                        acc.push(action)
                    } else {
                        // destination reached
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
            hp: this.life.getHP(),
            p: this.position.get(),
            c: this.owner.colorHex,
        }
    }
}
