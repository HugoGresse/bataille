import 'phaser'
import {StickUnit} from '../actors/StickUnit'
import { Tilemaps } from 'phaser';
import {BaseScene} from './BaseScene'
import {BatailleGame} from '../BatailleGame'

export class BatailleScene extends BaseScene {

    stick !: StickUnit
    private map!: Tilemaps.Tilemap;
    private tileset!: Tilemaps.Tileset
    private europeBorderImage!: Tilemaps.Tileset;
    private europeGroundImage!: Tilemaps.Tileset;
    private borderLayer!: Tilemaps.TilemapLayer;

    constructor() {
        super('BatailleScene')
    }

    preload() {
    }

    create() {
        this.scene.launch("UI")
        this.stick = new StickUnit(this, 100, 100)

        this.initMap()
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        const state = BatailleGame.getCurrentGame().getSocket().getLatestState()
        if(state) {
            state.units.forEach(unit => {
                new StickUnit(this, unit.position.x, unit.position.y)
            })
        }

        this.stick.update()
    }

    initMap() {
        this.map = this.make.tilemap({ key: 'europe', tileWidth: 16, tileHeight: 16 });

        // this.physics.world.setBounds(0, 0, this.borderLayer.width, this.borderLayer.height);
    }

}
