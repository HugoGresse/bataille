import { Player } from './model/Player'
import { GameLoop } from './GameLoop'
import { GameState, UnitState } from './model/GameState'
import { UnitAction } from '../common/UnitAction'
import { Map } from './model/map/Map'
import { SocketEmitter } from './SocketEmitter'
import { ExportType } from './model/types/ExportType'
import { townAssignation } from './utils/townAssignation'
import { detectTownIntersections } from './model/detectTownIntersections'
import { iterateOnXYMap } from './utils/xyMapToArray'
import { BaseUnit } from './model/actors/units/BaseUnit'
import { Tile, Town } from './model/map/Tile'
import { updatePlayerIncome } from './model/updatePlayerIncome'
import { IncomeDispatcher } from './model/income/IncomeDispatcher'
import { INCOME_MS } from '../common/GameSettings'
import { NewUnitDataEvent } from '../common/NewUnitDataEvent'
import { StickUnit } from './model/actors/units/StickUnit'
import { Position } from './model/actors/Position'
import { TILE_WIDTH_HEIGHT, UnitsType } from '../common/UNITS'
import { detectUnitsIntersections } from './model/detectUnitsIntersections'

export class Game {
    protected players: {
        [id: string]: Player
    } = {}
    protected gameLoop: GameLoop
    protected map: Map
    protected incomeDispatcher: IncomeDispatcher = new IncomeDispatcher(INCOME_MS)

    playersIntersections: Array<number> = []
    townsIntersections: Array<number> = []
    playerUpdates: Array<number> = []

    constructor(public readonly id: string, protected emitter: SocketEmitter) {
        this.map = new Map()
        this.gameLoop = new GameLoop(this.emitter)
    }

    stopLoop() {
        const player = Object.values(this.players)[0]
        if (player) {
            const units = player.getUnits()
            iterateOnXYMap<Tile>(this.map.getMapTiles(), (tile, x: number, y: number) => {
                if (tile.isTown) {
                    console.log('town', x, y, tile.player?.name)
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
            gameId: this.id,
            map: this.map.export(),
        }
    }

    getState(playerId: string): GameState {
        const units = Object.values(this.players).reduce((acc: UnitState[], player) => {
            return acc.concat(player.getUnitsState())
        }, [])
        const players = Object.values(this.players)
            .map((player) => player.getPublicPlayerState())
            .sort((p1, p2) => {
                return p2.income - p1.income
            })

        const currentPlayer = this.players[playerId]

        return {
            status: 'running',
            nextIncome: this.incomeDispatcher.getNextIncomeDelay(),
            players: players,
            currentPlayer: currentPlayer.getPrivatePlayerState(),
            units: units,
            towns: this.map.getTownsState(),
        }
    }

    addPlayer(player: Player, socketId: string) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...')
            return
        }
        if (!this.players[socketId]) {
            this.players[socketId] = player
        }
    }

    getPlayers(): Player[] {
        return Object.values(this.players)
    }

    addUnit(socketId: string, { x, y }: NewUnitDataEvent) {
        if (!this.players[socketId] || !this.gameLoop.isRunning) {
            return
        }
        const player = this.players[socketId]

        if (player.money >= UnitsType.Stick) {
            const position = new Position(x + TILE_WIDTH_HEIGHT / 2, y + TILE_WIDTH_HEIGHT / 2)
            const gridPosition = position.getRoundedPosition()
            const town = this.map.getTileAt<Town>(gridPosition.x, gridPosition.y)
            if (!town || town.player.id !== player.id) {
                return
            }
            const unit = new StickUnit(player, position)
            const unitCreated = player.addUnit(unit, gridPosition.x, gridPosition.y)
            if (unitCreated) {
                player.spendMoney(UnitsType.Stick)
            }
        }
    }

    unitEvent(playerId: string, event: UnitAction) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.players[playerId].unitAction(event)
    }

    playerMessage(playerId: string, message: string) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.emitter.emitMessage(message, this.players[playerId], true)
    }

    start(onGameEnded: (gameDurationSeconds: number) => void) {
        this.emitter.emitInitialGameState(this)
        townAssignation(this.getPlayers(), this.map)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this, onGameEnded)
        }
    }

    update(): boolean {
        let now = Date.now()
        detectUnitsIntersections(this.players)
        this.playersIntersections.push(Date.now() - now)
        const step1 = Date.now()

        const playersValues = Object.values(this.players)

        playersValues.forEach((player) => {
            player.update(this.map)

            const step2 = Date.now()
            this.playerUpdates.push(Date.now() - step1)

            detectTownIntersections(this.map, player)

            const step3 = Date.now() - step2
            this.townsIntersections.push(step3)

            updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
        })
        this.incomeDispatcher.update(this.players)

        const connectedPlayers = playersValues.filter((player) => player.isConnected) // No more player connected
        const deadPlayers = playersValues.filter((player) => player.isDead).length
        const oneOrNoAlivePlayers = deadPlayers >= playersValues.length - 1 // one player cannot play alone
        return connectedPlayers.length === 1 || (oneOrNoAlivePlayers && playersValues.length > 1) // also check if we are playing alone (in dev)
    }

    getWinner(): Player | undefined {
        const averageStep1 = average(this.playersIntersections) * 1000
        const averageStep2 = average(this.playerUpdates) * 1000
        const averageStep3 = average(this.townsIntersections) * 1000

        console.log(`
            step1: ${averageStep1}
            step2: ${averageStep2}
            step3: ${averageStep3}
        `)

        return Object.values(this.players).find((player) => !player.isDead)
    }
}

const average = (arr: Array<number>) => arr.reduce((p, c) => p + c, 0) / arr.length
