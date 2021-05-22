import 'phaser'
import {StickUnit} from '../actors/StickUnit'
import { Tilemaps } from 'phaser';
import {BaseScene} from './BaseScene'
import {BatailleGame} from '../BatailleGame'

export class BatailleScene extends BaseScene {

    private map!: Tilemaps.Tilemap;
    private tileset!: Tilemaps.Tileset
    private europeBorderImage!: Tilemaps.Tileset;
    private europeGroundImage!: Tilemaps.Tileset;
    private borderLayer!: Tilemaps.TilemapLayer;

    private units: {
        [id: string]: StickUnit
    } = {}


    constructor() {
        super('BatailleScene')
    }

    preload() {
    }

    create() {
        this.scene.launch("UI")

        this.initMap()
    }

    update(time: number, delta: number) {
        super.update(time, delta)

        const newState = BatailleGame.getCurrentGame().getSocket().getLatestState()
        if(newState) {
            const aliveUnits: string[] = []
            newState.units.forEach(unit => {
                aliveUnits.push(unit.id)
                if(this.units[unit.id]){
                    this.units[unit.id].update(unit)
                    console.log("update")
                } else {
                    this.units[unit.id] = new StickUnit(this, unit.position.x, unit.position.y )
                }
            })
            const thisUnitsIds = Object.keys(this.units)
            const deadUnits = aliveUnits.filter((obj) =>  { return thisUnitsIds.indexOf(obj) == -1; });
            if(deadUnits.length > 0) {
                console.log("dead:", deadUnits)
            }
        }
    }

    initMap() {
        this.map = this.make.tilemap({ key: 'europe', tileWidth: 16, tileHeight: 16 });

        // this.physics.world.setBounds(0, 0, this.borderLayer.width, this.borderLayer.height);
    }

}
