import { AbstractPlayer } from './AbstractPlayer'

export class NeutralPlayer extends AbstractPlayer {
    constructor() {
        super('Neutral', '0x888888')
    }
}

export const NeutralPlayerInstance = new NeutralPlayer()
