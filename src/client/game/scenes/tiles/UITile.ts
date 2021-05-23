import {Physics} from 'phaser'
import {TilePublic} from '../../../../server/model/map/Tile'
import {TERRAIN_GROUND, TERRAIN_WATER} from '../../../../common/UNITS'

export class UITile extends Physics.Arcade.Sprite {

    constructor(scene: Phaser.Scene, readonly x: number, readonly y: number, texture: string, private tileData : TilePublic) {
        super(scene, x, y, tileData.isTerrain? TERRAIN_GROUND : TERRAIN_WATER, undefined);
        scene.add.existing(this);
        // this.getBody().setSize(8, 8);
    }


    protected getBody(): Physics.Arcade.Body {
        return this.body as Physics.Arcade.Body;
    }

}
