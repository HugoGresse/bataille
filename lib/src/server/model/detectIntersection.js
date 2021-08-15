"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIntersection = void 0;
var xyMapToArray_1 = require("../utils/xyMapToArray");
var detectIntersection = function (map, player) {
    // Detect unit on a tile
    var units = player.getUnits();
    xyMapToArray_1.iterateOnXYMap(units, function (unit, x, y) {
        var tileX = map.getMapTiles()[x];
        if (tileX) {
            var tile = tileX[y];
            if (tile.isTown && (!tile.player || tile.player.id !== player.id)) {
                tile.player = player;
                unit.life.takeDamage(1);
            }
        }
    });
};
exports.detectIntersection = detectIntersection;
