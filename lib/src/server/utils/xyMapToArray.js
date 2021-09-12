'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.iterateOnXYMap = exports.xyMapToArray = void 0
const getKeys_1 = require('./getKeys')
function xyMapToArray(map) {
    const results = []
    const xKeys = getKeys_1.getKeys(map)
    let yKeys = []
    for (const x of xKeys) {
        yKeys = getKeys_1.getKeys(map[x])
        for (const y of yKeys) {
            results.push(map[x][y])
        }
    }
    return results
}
exports.xyMapToArray = xyMapToArray
function iterateOnXYMap(map, func) {
    const xKeys = getKeys_1.getKeys(map)
    let yKeys = []
    for (const x of xKeys) {
        yKeys = getKeys_1.getKeys(map[x])
        for (const y of yKeys) {
            func(map[x][y], x, y)
        }
    }
}
exports.iterateOnXYMap = iterateOnXYMap
