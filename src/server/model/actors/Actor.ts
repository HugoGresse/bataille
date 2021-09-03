import { Position } from './Position'
import { AbstractPlayer } from '../player/AbstractPlayer'

export class Actor {
    constructor(protected owner: AbstractPlayer, public position: Position) {}
}
