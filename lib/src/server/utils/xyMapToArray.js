'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.iterateOnXYMap = exports.xyMapToArray = void 0
var getKeys_1 = require('./getKeys')
function xyMapToArray(map) {
    var results = []
    var xKeys = getKeys_1.getKeys(map)
    var yKeys = []
    for (var _i = 0, xKeys_1 = xKeys; _i < xKeys_1.length; _i++) {
        var x = xKeys_1[_i]
        yKeys = getKeys_1.getKeys(map[x])
        for (var _a = 0, yKeys_1 = yKeys; _a < yKeys_1.length; _a++) {
            var y = yKeys_1[_a]
            results.push(map[x][y])
        }
    }
    return results
}
exports.xyMapToArray = xyMapToArray
function iterateOnXYMap(map, func) {
    var xKeys = getKeys_1.getKeys(map)
    var yKeys = []
    for (var _i = 0, xKeys_2 = xKeys; _i < xKeys_2.length; _i++) {
        var x = xKeys_2[_i]
        yKeys = getKeys_1.getKeys(map[x])
        for (var _a = 0, yKeys_2 = yKeys; _a < yKeys_2.length; _a++) {
            var y = yKeys_2[_a]
            func(map[x][y], x, y)
        }
    }
}
exports.iterateOnXYMap = iterateOnXYMap
