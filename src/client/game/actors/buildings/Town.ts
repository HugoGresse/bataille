import { Building } from './Building'
import { UIPlayer } from '../UIPlayer'
import { BUILDING_TOWN, TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { GameObjects, Display } from 'phaser'
import { TilePublic } from '../../../../server/model/map/Tile'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'
import { playTownCapturedSound } from '../../utils/sounds'

const textStyle = {
    ...TEXT_STYLE,
    color: '#000000',
}

export class Town extends Building {
    private playerRectangle: GameObjects.Rectangle
    public readonly id: string

    constructor(scene: Phaser.Scene, x: number, y: number, public tileData: TilePublic) {
        super(scene, x, y, BUILDING_TOWN)

        this.id = tileData.id

        if (tileData.n) {
            this.scene.add.text(this.x, this.y - 20, tileData.n, textStyle)
        }

        this.playerRectangle = this.scene.add.rectangle(
            this.x + TILE_WIDTH_HEIGHT / 2,
            this.y + TILE_WIDTH_HEIGHT / 2,
            TILE_WIDTH_HEIGHT,
            TILE_WIDTH_HEIGHT
        )
        this.setTownColor(tileData.p as UIPlayer)
    }

    update(tile: TilePublic, currentPlayerName: string | undefined) {
        if (this.tileData.p?.n === currentPlayerName && tile.p?.n !== currentPlayerName) {
            playTownCapturedSound()
        }
        this.setTownColor(tile.p as UIPlayer)
        this.tileData.p = tile.p
        super.update()
    }

    setTownColor(player: UIPlayer) {
        this.playerRectangle.setStrokeStyle(3, Display.Color.HexStringToColor(player.c || '#000000').color)
    }
}
