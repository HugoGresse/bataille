import {Server, Socket} from 'socket.io'
import {Player} from './model/Player'
import {StickUnit} from './model/actors/units/StickUnit'
import {Position} from './model/actors/Position'
import {GameLoop} from './GameLoop'
import {GameState, UnitState} from './model/GameState'
import {UnitAction} from '../common/UnitAction'
import {Map} from './model/map/Map'
import {SocketEmitter} from './SocketEmitter'
import {ExportType} from './model/types/ExportType'
import {townAssignation} from './utils/townAssignation'

const MINIMUM_PLAYER_PER_GAME = 1

export class Game {

    protected players: {
        [id: string]: Player
    } = {}
    protected gameLoop: GameLoop
    protected map: Map
    private emitter: SocketEmitter

    constructor(protected id: string, protected ioServer: Server) {
        this.emitter = new SocketEmitter(ioServer.to(id))
        this.map = new Map()
        this.gameLoop = new GameLoop(this.emitter, this.map)
    }

    stopLoop() {
        this.gameLoop.stop()
    }

    export (): ExportType {
        return {
            map: this.map.export()
        }
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

        if(Object.keys(this.players).length >= MINIMUM_PLAYER_PER_GAME) {
            this.start()
        }
        this.emitter.emitInitialGameState(this)
    }

    getPlayers(): Player[] {
        return Object.values(this.players)
    }

    addUnit(playerId: string) {
        if(!this.players[playerId]) {
            return
        }
        const player = this.players[playerId]
        const x = Math.floor(Math.random() * 300)
        const y = Math.floor(Math.random() * 300)
        player.addUnit(new StickUnit(player, new Position(x, y)))
        console.log("addUnit")
    }

    unitEvent(playerId: string, event: UnitAction) {
        if(this.players[playerId]){
            this.players[playerId].unitAction(event)
        }
    }

    start() {
        townAssignation(this.getPlayers(), this.map)
        if(!this.gameLoop.isRunning){
            this.gameLoop.start(this)
        }
    }

    update() {
        Object.values(this.players).forEach(player => player.update())
    }
}
