"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.townAssignation = void 0;
var shuffleArray_1 = require("../../utils/shuffleArray");
var xyMapToArray_1 = require("./xyMapToArray");
var StickUnit_1 = require("../model/actors/units/StickUnit");
var Position_1 = require("../model/actors/Position");
var UNITS_1 = require("../../common/UNITS");
var townAssignation = function (players, map) {
    var towns = map.getTowns();
    // Only let 1/5 of the towns to be assigned to player at start
    var townByPlayer = Math.floor(towns.length / players.length / 5);
    var shuffledTowns = shuffleArray_1.shuffleArray(towns);
    var i = 0;
    var playerIndex = 0;
    for (var _i = 0, shuffledTowns_1 = shuffledTowns; _i < shuffledTowns_1.length; _i++) {
        var town = shuffledTowns_1[_i];
        town.player = players[playerIndex];
        town.isNeutral = false;
        i += 1;
        if (i >= townByPlayer) {
            playerIndex += 1;
            i = 0;
        }
        if (playerIndex >= players.length) {
            break;
        }
    }
    var mapTiles = map.getMapTiles();
    xyMapToArray_1.iterateOnXYMap(mapTiles, function (tile, x, y) {
        if (tile.isTown && tile.player && !tile.isNeutral) {
            tile.player.addUnit(new StickUnit_1.StickUnit(tile.player, new Position_1.Position(x * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2, y * UNITS_1.TILE_WIDTH_HEIGHT + UNITS_1.TILE_WIDTH_HEIGHT / 2)), x, y);
        }
    });
};
exports.townAssignation = townAssignation;
