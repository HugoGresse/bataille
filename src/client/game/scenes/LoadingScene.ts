import 'phaser'
import {BUILDING_TOWN, UNIT_STICK} from '../../../constants/UNITS'

export class LoadingScene extends Phaser.Scene {

    constructor() {
        super('LoadingScene')
    }
    preload() {
        this.load.image(BUILDING_TOWN, 'assets/svg/town.svg')
        this.load.image(UNIT_STICK, 'assets/svg/u-stick.svg')


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
