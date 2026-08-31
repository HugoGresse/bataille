import * as Phaser from 'phaser'
import { Building } from './Building'
import { UIPlayer } from '../UIPlayer'
import { BUILDING_TOWN, TILE_WIDTH_HEIGHT } from '../../../../common/UNITS'
import { GameObjects, Display } from 'phaser'
import { TilePublic } from '../../../../server/model/map/Tile'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'
import { playTownCapturedSound } from '../../utils/sounds'
import { DEPTH_MAP_LABEL, DEPTH_TOWN_MARK } from '../../scenes/depth'

const textStyle = {
    ...TEXT_STYLE,
    color: '#000000',
}

export class Town extends Building {
    private playerRectangle: GameObjects.Rectangle
    public readonly id: string

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        public tileData: TilePublic
    ) {
        super(scene, x, y, BUILDING_TOWN)

        this.id = tileData.id

        if (tileData.n) {
            this.scene.add.text(this.x, this.y - 20, tileData.n, textStyle).setDepth(DEPTH_MAP_LABEL)
        }

        this.playerRectangle = this.scene.add.rectangle(
            this.x + TILE_WIDTH_HEIGHT / 2,
            this.y + TILE_WIDTH_HEIGHT / 2,
            TILE_WIDTH_HEIGHT,
            TILE_WIDTH_HEIGHT
        )
        this.playerRectangle.setDepth(DEPTH_TOWN_MARK)
        this.setTownColor(tileData.p as UIPlayer)
    }

    /**
     * @return the previous owner name when this update changed hands, null otherwise. The caller
     * turns that into a ripple on the board.
     */
    update(tile: TilePublic, currentPlayerName: string | undefined): string | null {
        const previousOwner = this.tileData.p?.n ?? null
        const changed = previousOwner !== (tile.p?.n ?? null)
        if (previousOwner === currentPlayerName && tile.p?.n !== currentPlayerName) {
            playTownCapturedSound()
        }
        this.setTownColor(tile.p as UIPlayer)
        this.tileData.p = tile.p
        super.update()
        return changed ? previousOwner : null
    }

    /** Tile coordinates this town sits on */
    getTile(): { x: number; y: number } {
        return { x: Math.floor(this.x / TILE_WIDTH_HEIGHT), y: Math.floor(this.y / TILE_WIDTH_HEIGHT) }
    }

    getOwnerColor(): string | undefined {
        return this.tileData.p?.c
    }

    setTownColor(player: UIPlayer) {
        this.playerRectangle.setStrokeStyle(3, Display.Color.HexStringToColor(player.c || '#000000').color)
    }
}
