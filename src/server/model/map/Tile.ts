import { v4 as uuidv4 } from 'uuid'
import { TownsData } from '../types/TownsData'
import { TileType } from '../../../common/TileType'
import { AbstractPlayer } from '../player/AbstractPlayer'
import { NeutralPlayerInstance } from '../player/NeutralPlayer'

export type TilePublic = {
    id: string
    p?: {
        // Player
        n: string // name
        c: string // color
    }
    isT: boolean // isTown
    n?: string // name
}

export class Tile {
    public readonly id: string
    public isTerrain = false
    public isTown = false
    public player?: AbstractPlayer
    public isNeutral = true
    public readonly data?: TownsData
    public readonly velocityFactor: number = 1

    constructor(
        tileNumber: number | undefined,
        townsData: TownsData | null = null,
        public readonly x: number,
        public readonly y: number
    ) {
        this.id = uuidv4()
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
                this.player = NeutralPlayerInstance
                this.isTown = true
                if (townsData) {
                    this.data = townsData
                } else {
                    throw new Error('Missing towns data, n: ' + tileNumber)
                }
                break
            case TileType.Water:
                this.velocityFactor = 0.15
                break
            case TileType.WaterDeep:
                this.velocityFactor = 0.1
                break
            case TileType.WaterDeepSelected:
            case TileType.WaterSelected:
            case TileType.TownSelected:
                // ignored
                break
            default:
                console.log('Tile type not managed', tileNumber)
        }
    }

    export(): TilePublic {
        const exportData: TilePublic = {
            id: this.id,
            isT: this.isTown,
            n: this.data?.name,
        }
        if (this.player) {
            exportData.p = {
                n: this.player.name,
                c: this.player.color,
            }
        }
        return exportData
    }
}

export interface Town extends Tile {
    player: AbstractPlayer
}
