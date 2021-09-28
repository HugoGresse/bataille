import 'phaser'

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super('LoadingScene')
    }
    preload() {
        this.load.image('tiles', '/assets/tilemaps/tiles/tile.png?ts=1')
        this.load.spritesheet('tilesSpriteSheet', '/assets/tilemaps/tiles/tile.png', {
            frameWidth: 32,
            frameHeight: 32,
        })
        this.load.tilemapTiledJSON('map', '/assets/tilemaps/json/map.json?ts=1')
    }

    create(): void {
        this.scene.start('BatailleScene')
    }
}
