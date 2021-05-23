import {Player} from '../Player'

enum TileType {
    None = 0,
    Ground = 1,
    GroundBorder = 2
}

export type TilePublic = {
    player ?: string,
    isTerrain: boolean
}

export class Tile {

    public isTerrain = false
    public isTown = false
    public player: Player | null = null
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
            default:
                console.log("Tile type not managed", tileNumber)

        }
    }

    export(): TilePublic {
        return {
            player: this.player?.name,
            isTerrain: this.isTerrain
        }
    }

}
