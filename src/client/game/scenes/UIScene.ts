import 'phaser'
import {BaseScene} from './BaseScene'

export class UIScene extends BaseScene {
    constructor() {
        super('UI')
    }

    create() {

        const newStick = this.add
            .text(100, 100, 'New stick', { color: '#00ff00' })
            .setInteractive()
            .on('pointerup', () => {

                this.actions.newUnit()
                console.log(this.registry.get('actions'))

            } );
    }

}
