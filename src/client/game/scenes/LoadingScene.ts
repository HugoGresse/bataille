import 'phaser'
import {BUILDING_TOWN, TERRAIN_GROUND, TERRAIN_WATER, UNIT_STICK} from '../../../common/UNITS'

export class LoadingScene extends Phaser.Scene {

    constructor() {
        super('LoadingScene')
    }
    preload() {
        this.load.image(BUILDING_TOWN, 'assets/svg/town.svg')
        this.load.image(UNIT_STICK, 'assets/svg/u-stick.svg')
        this.load.image(TERRAIN_GROUND, 'assets/svg/ground.png')
        this.load.image(TERRAIN_WATER, 'assets/svg/water.png')


        this.load.image({
            key: 'borderImg',
            url: 'assets/tilemaps/tiles/border.png',
        });
        this.load.image({
            key: 'groundImg',
            url: 'assets/tilemaps/tiles/ground-ugly.png',
        });
        this.load.image({
            key: 'bordertest',
            url: 'assets/tilemaps/tiles/bordertest.png',
        });
        this.load.tilemapTiledJSON('europe', 'assets/tilemaps/json/map.json');
    }

    create(): void {
        this.scene.start('BatailleScene');
    }

}
