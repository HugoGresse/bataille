import { Position } from './Position'
import { AbstractPlayer } from '../player/AbstractPlayer'

export class Actor {
    constructor(public readonly owner: AbstractPlayer, public position: Position) {}
}
