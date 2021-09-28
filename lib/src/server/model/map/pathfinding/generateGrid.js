'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.generateGrid = void 0
const pathfinding_1 = require('pathfinding')
const generateGrid = (tiles = {}, width, height) => {
    const grid = new pathfinding_1.Grid(width, height)
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (!tiles[x] || !tiles[x][y] || tiles[x][y].isCrossable()) {
                grid.setWalkableAt(x, y, true)
            } else {
                grid.setWalkableAt(x, y, false)
            }
        }
    }
    return grid
}
exports.generateGrid = generateGrid
