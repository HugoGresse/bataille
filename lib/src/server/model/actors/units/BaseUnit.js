'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.BaseUnit = void 0
const Actor_1 = require('../Actor')
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
        const currentSpeed = this.velocity.modulate(this.position, map)
        this.actions = this.actions.reduce((acc, action) => {
            switch (action.type) {
                case UnitAction_1.UnitActionType.Move:
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
    getPublicState() {
        return {
            id: this.id,
            hp: this.life.getHP(),
            position: this.position.get(),
            color: this.owner.colorHex,
        }
    }
}
exports.BaseUnit = BaseUnit
