import { Tilemaps } from 'phaser';
import {BatailleScene} from './BatailleScene'

export const tileSelectionDetector = (scene: BatailleScene, map: Tilemaps.Tilemap) => {
    // Draw tiles (only within the groundLayer)
    if (scene.input.manager.activePointer) {

        for(const layer of map.layers){
            const tile = map.getTileAtWorldXY(scene.input.activePointer.worldX, scene.input.activePointer.worldY, false, undefined, layer.name);

            if(tile) {
                console.log("found tile", tile)
                return
            }
        }
    }
}
