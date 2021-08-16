"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iterateOnXYMap = exports.xyMapToArray = void 0;
function xyMapToArray(map) {
    var xs = Object.keys(map).map(Number);
    return xs.reduce(function (acc, x) {
        Object.keys(map[x])
            .map(Number)
            .forEach(function (y) {
            acc.push(map[x][y]);
        });
        return acc;
    }, []);
}
exports.xyMapToArray = xyMapToArray;
function iterateOnXYMap(map, func) {
    var xs = Object.keys(map).map(Number);
    return xs.forEach(function (x) {
        Object.keys(map[x])
            .map(Number)
            .forEach(function (y) {
            func(map[x][y], x, y);
        });
    });
}
exports.iterateOnXYMap = iterateOnXYMap;
