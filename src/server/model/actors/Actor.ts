import {AbstractPlayer} from '../Player'
import { Position } from './Position'

export class Actor {
    constructor(protected owner: AbstractPlayer, public position: Position) {}
}
