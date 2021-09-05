'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Tile = void 0
var uuid_1 = require('uuid')
var TileType_1 = require('../../../common/TileType')
var NeutralPlayer_1 = require('../player/NeutralPlayer')
var Tile = /** @class */ (function () {
    function Tile(tileNumber, townsData, x, y) {
        if (townsData === void 0) {
            townsData = null
        }
        this.x = x
        this.y = y
        this.isTerrain = false
        this.isTown = false
        this.isNeutral = true
        this.velocityFactor = 1
        this.id = uuid_1.v4()
        switch (tileNumber) {
            case TileType_1.TileType.None:
                this.isNeutral = true
                break
            case TileType_1.TileType.Ground:
            case TileType_1.TileType.GroundBorder:
                this.isTerrain = true
                break
            case TileType_1.TileType.Town:
            case TileType_1.TileType.Port:
                this.player = NeutralPlayer_1.NeutralPlayerInstance
                this.isTown = true
                if (townsData) {
                    this.data = townsData
                } else {
                    throw new Error('Missing towns data, n: ' + tileNumber)
                }
                break
            case TileType_1.TileType.Water:
                this.velocityFactor = 0.15
                break
            case TileType_1.TileType.WaterDeep:
                this.velocityFactor = 0.1
                break
            case TileType_1.TileType.WaterDeepSelected:
            case TileType_1.TileType.WaterSelected:
            case TileType_1.TileType.TownSelected:
                // ignored
                break
            default:
                console.log('Tile type not managed', tileNumber)
        }
    }
    Tile.prototype.export = function () {
        var _a
        var exportData = {
            id: this.id,
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
