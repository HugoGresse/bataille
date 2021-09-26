import { Actor } from '../Actor'
import { Position } from '../Position'
import { Life } from '../Life'
import { UnitsType } from '../../../../common/UNITS'
import { v4 as uuidv4 } from 'uuid'
import { UnitAction, UnitActionType } from '../../../../common/UnitAction'
import { Velocity } from '../Velocity'
import { GameMap } from '../../map/GameMap'
import { AbstractPlayer } from '../../player/AbstractPlayer'
import { UnitState } from '../../GameState'
import { AStarFinder } from 'pathfinding'

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
                this.actions.push(new UnitAction(action.unitId, action.type, action.data))
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
                        console.log(action)
                        action.calculatePath(this.position, map)

                        // TODO :
                        // 1. use Path to calculate the vector to move to (not from the destination
                        // 2. Remove element from path once the current path has been completed to start the new one
                        // 3. WHen no more path, check destination reached
                    }

                    const [stopped, isDestinationReached] = this.position.move(
                        action.data.destination,
                        this.velocity,
                        map
                    )

                    if (stopped && isDestinationReached) {
                        // Calculate alternate path
                    }

                    if (!stopped) {
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
            hp: this.life.getHP(),
            p: this.position.get(),
            c: this.owner.colorHex,
        }
    }
}
