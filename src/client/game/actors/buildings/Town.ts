import {Building} from './Building'
import {UIPlayer} from '../UIPlayer'
import {BUILDING_TOWN, TILE_WIDTH_HEIGHT} from '../../../../common/UNITS'
import { GameObjects, Display } from 'phaser'
import {TilePublic} from '../../../../server/model/map/Tile'

export class Town extends Building {
    private playerRectangle: GameObjects.Rectangle
    public readonly id: string

    constructor(scene: Phaser.Scene, x: number, y: number, public tileData: TilePublic) {
        super(scene, x, y, BUILDING_TOWN)

        this.id = tileData.id
        this.playerRectangle = this.scene.add.rectangle(this.x +TILE_WIDTH_HEIGHT/2, this.y+TILE_WIDTH_HEIGHT/2 , TILE_WIDTH_HEIGHT, TILE_WIDTH_HEIGHT);
        this.setTownColor(tileData.player as UIPlayer)
    }

    update(tile: TilePublic) {
        this.setTownColor(tile.player as UIPlayer)
        this.tileData.player = tile.player
    }

    setTownColor(player: UIPlayer) {
        this.playerRectangle.setStrokeStyle(3, Display.Color.HexStringToColor(player.color || "#000000").color)
    }
}
