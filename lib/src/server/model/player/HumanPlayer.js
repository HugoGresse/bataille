'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.HumanPlayer = void 0
const AbstractPlayer_1 = require('./AbstractPlayer')
class HumanPlayer extends AbstractPlayer_1.AbstractPlayer {
    constructor(socket, color, name) {
        super(name, color)
        this.socket = socket
    }
    listenForDisconnect(socketEmitter, onPlayerDisconnect) {
        this.socket.on('disconnect', () => {
            socketEmitter.emitMessage(`ℹ️️ Player disconnected: ${this.name}`, this)
            this.setConnected(false)
            onPlayerDisconnect()
        })
    }
    getSocketId() {
        return this.socket.id
    }
}
exports.HumanPlayer = HumanPlayer
