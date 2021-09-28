'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.UnitActionType = exports.UnitActionMoveData = exports.UnitAction = void 0
const pathfinding_1 = require('pathfinding')
const UNITS_1 = require('./UNITS')
const pathFinder = new pathfinding_1.AStarFinder({
    diagonalMovement: pathfinding_1.DiagonalMovement.OnlyWhenNoObstacles,
})
class UnitAction {
    constructor(unitId, type, data) {
        this.unitId = unitId
        this.type = type
        this.data = data
        this.path = null
        this.currentPathIndex = -1
        this.currentPathItem = []
    }
    calculatePath(startPosition, map) {
        const dest = this.data.destination.getRounded()
        const startRounded = startPosition.getRounded()
        const originalPath = pathFinder.findPath(
            startRounded.x,
            startRounded.y,
            dest.x,
            dest.y,
            map.pathFindingGrid.clone()
        )
        originalPath.shift()
        this.path = []
        for (const p of originalPath) {
            this.path.push([
                p[0] * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT_HALF,
                p[1] * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT_HALF,
            ])
        }
    }
    getNextPoint() {
        if (!this.path || this.currentPathIndex >= this.path.length) {
            return null
        }
        return this.currentPathItem
    }
    moveToNextPoint() {
        if (this.path) {
            this.currentPathIndex++
            this.currentPathItem = this.path[this.currentPathIndex]
        }
    }
}
exports.UnitAction = UnitAction
class UnitActionMoveData {
    constructor(destination) {
        this.destination = destination
    }
}
exports.UnitActionMoveData = UnitActionMoveData
var UnitActionType
;(function (UnitActionType) {
    UnitActionType[(UnitActionType['Move'] = 0)] = 'Move'
})((UnitActionType = exports.UnitActionType || (exports.UnitActionType = {})))
