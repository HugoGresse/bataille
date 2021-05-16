import {Server, Socket} from 'socket.io'
import {Player} from './model/Player'
import {StickUnit} from './model/actors/units/StickUnit'
import {Position} from './model/actors/Position'
import {GameLoop} from './GameLoop'
import {GameState, UnitState} from './model/GameState'

export class Game {

    protected players: {
        [id: string]: Player
    } = {}
    protected gameLoop: GameLoop

    constructor(protected id: string, protected ioServer: Server) {
        this.gameLoop = new GameLoop(ioServer.to(id))
    }

    getState(): GameState {
        const units = Object
            .values(this.players)
            .reduce((acc: UnitState[], player) => {
                return acc.concat(player.getUnitsState())
            }, [])
        const players = Object
            .values(this.players)
            .map(player => player.getPlayerState())

        return {
            status: 'running',
            players: players,
            units: units,
            towns: []
        }
    }

    addPlayer(player: Player, socket: Socket) {
        if(!this.players[socket.id]) {
            this.players[socket.id] = player
        }
        socket.join(this.id)
        console.log("add player")

        if(!this.gameLoop.isRunning) {
            this.gameLoop.start(this)
        }
    }


    addUnit(playerId: string) {
        const player = this.players[playerId]
        const x = Math.floor(Math.random() * 300)
        const y = Math.floor(Math.random() * 300)
        player.addUnit(new StickUnit(player, new Position(x, y)))
        console.log("addUnit")
    }
}
