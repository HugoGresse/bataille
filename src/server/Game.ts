import {Server, Socket} from 'socket.io'
import {Player} from './model/Player'
import {GameLoop} from './GameLoop'
import {GameState, UnitState} from './model/GameState'
import {UnitAction} from '../common/UnitAction'
import {Map} from './model/map/Map'
import {SocketEmitter} from './SocketEmitter'
import {ExportType} from './model/types/ExportType'
import {townAssignation} from './utils/townAssignation'
import {detectIntersection} from './model/detectIntersection'
import {iterateOnXYMap} from './utils/xyMapToArray'
import {BaseUnit} from './model/actors/units/BaseUnit'
import {Tile} from './model/map/Tile'
import {updatePlayerIncome} from './model/updatePlayerIncome'
import {IncomeDispatcher} from './model/income/IncomeDispatcher'
import {INCOME_MS} from '../common/GameSettings'

const MINIMUM_PLAYER_PER_GAME = 2

export class Game {

    protected players: {
        [id: string]: Player
    } = {}
    protected gameLoop: GameLoop
    protected map: Map
    protected incomeDispatcher: IncomeDispatcher = new IncomeDispatcher(INCOME_MS)
    private emitter: SocketEmitter

    constructor(protected id: string, protected ioServer: Server) {
        this.emitter = new SocketEmitter(ioServer.to(id))
        this.map = new Map()
        this.gameLoop = new GameLoop(this.emitter, this.map)
    }

    stopLoop() {
        const player = Object.values(this.players)[0]
        const units = player.getUnits()

        iterateOnXYMap<Tile>(this.map.getMapTiles(), (tile, x: number, y: number) => {
                if(tile.isTown) {
                    console.log("town", x, y, tile.player?.name)
                }
        })
        iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
            console.log('unit', x, y)
        })
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
            towns: this.map.getTownsState()
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
        // const player = this.players[playerId]
        // const x = Math.floor(Math.random() * 300)
        // const y = Math.floor(Math.random() * 300)
        // player.addUnit(new StickUnit(player, new Position(x, y)))
        console.log("addUnit, TODO")
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
        Object.values(this.players).forEach(player => {
            player.update()
            detectIntersection(this.map, player)
            updatePlayerIncome(this.map.getTownsByCountries(), player)
        })
        this.incomeDispatcher.update(this.players)
    }
}
