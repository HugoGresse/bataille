import {NeutralPlayerInstance, Player} from '../Player'

export enum TileType {
    None = 0,
    Ground = 1,
    GroundBorder = 3,
    Town= 17,
    Port= 19,
}

export type TilePublic = {
    player ?: {
        name: string,
        color: string
    },
    isTerrain: boolean
    isTown: boolean
}

export class Tile {

    public isTerrain = false
    public isTown = false
    public player ?: Player
    public isNeutral = true

    constructor(tileNumber: number | undefined) {
        switch(tileNumber){
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
                break
            default:
                console.log("Tile type not managed", tileNumber)
        }
    }

    export(): TilePublic {
        const exportData: TilePublic = {
            isTerrain: this.isTerrain,
            isTown: this.isTown
        }
        if(this.player) {
            exportData.player = {
                name: this.player.name,
                color: this.player.color
            }
        }
        return exportData
    }

}
