import 'phaser'
import {UNIT_STICK} from '../../../common/UNITS'

export class LoadingScene extends Phaser.Scene {

    constructor() {
        super('LoadingScene')
    }
    preload() {
        this.load.image(UNIT_STICK, 'assets/svg/u-stick.svg')

        this.load.image("tiles", "assets/tilemaps/tiles/tile.png");
        this.load.tilemapTiledJSON('map', 'assets/tilemaps/json/map.json');
    }

    create(): void {
        this.scene.start('BatailleScene');
    }

}
