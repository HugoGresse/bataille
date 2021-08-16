'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Tile = exports.TileType = void 0
var Player_1 = require('../Player')
var uuid_1 = require('uuid')
var TileType
;(function (TileType) {
    TileType[(TileType['None'] = 0)] = 'None'
    TileType[(TileType['Ground'] = 1)] = 'Ground'
    TileType[(TileType['GroundBorder'] = 3)] = 'GroundBorder'
    TileType[(TileType['Town'] = 17)] = 'Town'
    TileType[(TileType['Port'] = 19)] = 'Port'
})((TileType = exports.TileType || (exports.TileType = {})))
var Tile = /** @class */ (function () {
    function Tile(tileNumber, townsData) {
        if (townsData === void 0) {
            townsData = null
        }
        this.isTerrain = false
        this.isTown = false
        this.isNeutral = true
        this.id = uuid_1.v4()
        switch (tileNumber) {
            case TileType.None:
                this.isNeutral = true
                break
            case TileType.Ground:
            case TileType.GroundBorder:
                this.isTerrain = true
                break
            case TileType.Town:
            case TileType.Port:
                this.player = Player_1.NeutralPlayerInstance
                this.isTown = true
                if (townsData) {
                    this.data = townsData
                } else {
                    throw new Error('Missing towns data')
                }
                break
            default:
                console.log('Tile type not managed', tileNumber)
        }
    }
    Tile.prototype.export = function () {
        var _a
        var exportData = {
            id: this.id,
            isTerrain: this.isTerrain,
            isTown: this.isTown,
            name: (_a = this.data) === null || _a === void 0 ? void 0 : _a.name,
        }
        if (this.player) {
            exportData.player = {
                name: this.player.name,
                color: this.player.color,
            }
        }
        return exportData
    }
    return Tile
})()
exports.Tile = Tile
