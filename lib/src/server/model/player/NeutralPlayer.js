'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.NeutralPlayerInstance = exports.NeutralPlayer = void 0
const AbstractPlayer_1 = require('./AbstractPlayer')
class NeutralPlayer extends AbstractPlayer_1.AbstractPlayer {
    constructor() {
        super('Neutral', '0x888888')
    }
}
exports.NeutralPlayer = NeutralPlayer
exports.NeutralPlayerInstance = new NeutralPlayer()
