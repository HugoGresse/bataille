import { Actor } from '../Actor'
import { Position } from '../Position'
import { Life } from '../Life'
import { UnitsType } from '../../../../common/UNITS'
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
    /**
     * When a stack is split to move only a part of it, the units left behind are kept here until
     * the moving stack actually leaves its tile (the grid allows only one unit per tile).
     */
    public pendingRemnant: BaseUnit | null = null

    protected constructor(
        owner: AbstractPlayer,
        position: Position,
        public readonly damage: number,
        hp: number,
        protected velocity: Velocity
    ) {
        super(owner, position)
        this.id = crypto.randomUUID()
        this.life = new Life(hp)
    }

    /**
     * Create a new unit of the same type at the same position with the given amount of HP (stack split).
     */
    public abstract spawnCopy(hp: number): BaseUnit

    addAction(action: UnitAction) {
        switch (action.type) {
            case UnitActionType.Move:
                // Remove any move action already saved
                this.actions = this.actions.filter((action) => action.type !== UnitActionType.Move)
                this.actions.push(
                    new UnitAction(
                        action.unitId,
                        action.type,
                        new UnitActionMoveData(
                            new Position(action.data.destination.x, action.data.destination.y),
                            action.data.amount
                        )
                    )
                )
                break
            default:
                console.log('addAction: Unit action type not managed', action)
                break
        }
    }

    /**
     * True while the unit still has a move action with waypoints to cover: it is traveling
     * toward its destination and may cross tiles without stopping on them.
     */
    isTraveling(): boolean {
        return this.actions.some((action) => action.type === UnitActionType.Move && action.hasNextPoint())
    }

    postponeAction() {
        this.postponedAction = true
    }

    update(map: GameMap): boolean {
        // A forced report still runs the unit's moves this tick: skipping them would make a due step
        // land a tick later than the time its piece was told to arrive
        const forced = this.forceUpdate
        this.forceUpdate = false
        if (this.actions.length === 0) {
            return forced
        }
        if (this.postponedAction) {
            this.postponedAction = false
            return forced
        }
        let unitMoved = false
        // A unit setting off is reported at once, with where it is heading, so its piece starts
        // gliding now rather than one whole step later
        let setOff = false

        const nextActions = []
        for (const action of this.actions) {
            switch (action.type) {
                case UnitActionType.Move:
                    if (!action.path) {
                        action.calculatePath(this.position, map)
                        action.moveToNextPoint()
                        setOff = true
                    }

                    const nextPoint = action.getNextPoint()
                    if (nextPoint) {
                        const moved = this.position.move(nextPoint, this.velocity, map)
                        if (moved) {
                            action.moveToNextPoint()
                            unitMoved = true
                            if (!action.hasNextPoint()) {
                                this.position.stopWaiting()
                            }
                        }
                        nextActions.push(action)
                    } else {
                        // destination reached
                    }
                    break
                default:
                    console.log('update: Unit action type not managed', action)
                    break
            }
        }
        this.actions = nextActions
        return unitMoved || setOff || forced
    }

    /** The waypoint this unit steps onto next, while it is still on its way */
    private nextStep(): number[] | null {
        const move = this.actions.find((action) => action.type === UnitActionType.Move && action.hasNextPoint())
        return move?.getNextPoint() ?? null
    }

    getPublicState(): UnitState {
        const state: UnitState = {
            id: this.id,
            hp: this.life.getHP(),
            p: this.position.get(),
            c: this.owner.colorHex,
        }
        const next = this.nextStep()
        const msToNext = next ? this.position.msUntilNextStep() : undefined
        if (next && msToNext !== undefined) {
            state.n = { x: next[0], y: next[1] }
            state.w = msToNext
        }
        return state
    }
}
