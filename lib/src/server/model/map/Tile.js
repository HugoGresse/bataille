'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Tile = void 0
const uuid_1 = require('uuid')
const TileType_1 = require('../../../common/TileType')
const NeutralPlayer_1 = require('../player/NeutralPlayer')
class Tile {
    constructor(tileNumber, townsData = null, x, y) {
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
                this.velocityFactor = 0.3
                break
            case TileType_1.TileType.WaterDeep:
                this.velocityFactor = 0.2
                break
            case TileType_1.TileType.ForestSmall:
                this.velocityFactor = 0.8
                break
            case TileType_1.TileType.ForestBig:
                this.velocityFactor = 0.6
                break
            case TileType_1.TileType.MountainSmall:
                this.velocityFactor = 0.5
                break
            case TileType_1.TileType.MountainBig:
                this.velocityFactor = 0
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
    export() {
        var _a
        const exportData = {
            id: this.id,
            isT: this.isTown,
            n: (_a = this.data) === null || _a === void 0 ? void 0 : _a.name,
        }
        if (this.player) {
            exportData.p = {
                n: this.player.name,
                c: this.player.color,
            }
        }
        return exportData
    }
    isCrossable() {
        return this.velocityFactor > 0
    }
}
exports.Tile = Tile
