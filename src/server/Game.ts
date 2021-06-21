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
import {INCOME_MS, MINIMUM_PLAYER_PER_GAME} from '../common/GameSettings'
import {NewUnitDataEvent} from '../common/NewUnitDataEvent'
import {StickUnit} from './model/actors/units/StickUnit'
import {Position} from './model/actors/Position'
import {TILE_WIDTH_HEIGHT, UnitsType} from '../common/UNITS'

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
        if (player) {
            const units = player.getUnits()
            iterateOnXYMap<Tile>(this.map.getMapTiles(), (tile, x: number, y: number) => {
                if (tile.isTown) {
                    console.log("town", x, y, tile.player?.name)
                }
            })
            iterateOnXYMap<BaseUnit>(units, (unit, x: number, y: number) => {
                console.log('unit', x, y)
            })
        }
        this.gameLoop.stop()
    }

    export(): ExportType {
        return {
            map: this.map.export()
        }
    }

    getState(playerId: string): GameState {
        const units = Object
            .values(this.players)
            .reduce((acc: UnitState[], player) => {
                return acc.concat(player.getUnitsState())
            }, [])
        const players = Object
            .values(this.players)
            .map(player => player.getPublicPlayerState())

        const currentPlayer = this.players[playerId]

        return {
            status: 'running',
            players: players,
            currentPlayer: currentPlayer.getPrivatePlayerState(),
            units: units,
            towns: this.map.getTownsState()
        }
    }

    addPlayer(player: Player, socket: Socket) {
        if (this.gameLoop.isRunning) {
            console.log("Attempt to join a game but is already started...")
            return
        }
        if (!this.players[socket.id]) {
            this.players[socket.id] = player
        }
        socket.join(this.id)
        console.log("add player")

        if (Object.keys(this.players).length >= MINIMUM_PLAYER_PER_GAME) {
            this.start()
        }
        this.emitter.emitInitialGameState(this)
    }

    getPlayers(): Player[] {
        return Object.values(this.players)
    }

    addUnit(playerId: string, {x, y}: NewUnitDataEvent) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        const player = this.players[playerId]

        if(player.money >= UnitsType.Stick) {
            const unit = new StickUnit(player, new Position(x + TILE_WIDTH_HEIGHT / 2, y + TILE_WIDTH_HEIGHT / 2))
            player.addUnit(unit, x, y)
            player.spendMoney(UnitsType.Stick)
        }
        // TODO : display city name in overlay
    }

    unitEvent(playerId: string, event: UnitAction) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.players[playerId].unitAction(event)
    }

    start() {
        townAssignation(this.getPlayers(), this.map)
        if (!this.gameLoop.isRunning) {
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
