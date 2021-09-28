'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.BaseUnit = void 0
const Actor_1 = require('../Actor')
const Position_1 = require('../Position')
const Life_1 = require('../Life')
const UNITS_1 = require('../../../../common/UNITS')
const uuid_1 = require('uuid')
const UnitAction_1 = require('../../../../common/UnitAction')
class BaseUnit extends Actor_1.Actor {
    constructor(owner, position, damage, hp, velocity) {
        super(owner, position)
        this.damage = damage
        this.velocity = velocity
        this.type = UNITS_1.UnitsType.Stick
        this.actions = []
        this.postponedAction = false
        this.forceUpdate = true
        this.id = uuid_1.v4()
        this.life = new Life_1.Life(hp)
    }
    addAction(action) {
        switch (action.type) {
            case UnitAction_1.UnitActionType.Move:
                // Remove any move action already saved
                this.actions = this.actions.filter((action) => action.type !== UnitAction_1.UnitActionType.Move)
                this.actions.push(
                    new UnitAction_1.UnitAction(
                        action.unitId,
                        action.type,
                        new UnitAction_1.UnitActionMoveData(
                            new Position_1.Position(action.data.destination.x, action.data.destination.y)
                        )
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
    update(map) {
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
        let unitMoved = false
        const nextActions = []
        for (const action of this.actions) {
            switch (action.type) {
                case UnitAction_1.UnitActionType.Move:
                    if (!action.path) {
                        action.calculatePath(this.position, map)
                        action.moveToNextPoint()
                    }
                    const nextPoint = action.getNextPoint()
                    if (nextPoint) {
                        const moved = this.position.move(nextPoint, this.velocity, map)
                        if (moved) {
                            action.moveToNextPoint()
                            unitMoved = true
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
        return unitMoved
    }
    getPublicState() {
        return {
            id: this.id,
            hp: this.life.getHP(),
            p: this.position.get(),
            c: this.owner.colorHex,
        }
    }
}
exports.BaseUnit = BaseUnit
