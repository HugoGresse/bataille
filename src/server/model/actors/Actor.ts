import {Player} from '../Player'
import {Position} from './Position'

export class Actor {

    constructor(protected owner: Player, public position: Position) {
    }
}
