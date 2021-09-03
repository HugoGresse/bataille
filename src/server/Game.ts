import { HumanPlayer } from './model/player/HumanPlayer'
import { GameLoop } from './GameLoop'
import { GameState, UnitState } from './model/GameState'
import { UnitAction } from '../common/UnitAction'
import { Map } from './model/map/Map'
import { SocketEmitter } from './SocketEmitter'
import { ExportType } from './model/types/ExportType'
import { townAssignation } from './utils/townAssignation'
import { detectTownIntersections } from './engine/detectTownIntersections'
import { updatePlayerIncome } from './engine/updatePlayerIncome'
import { IncomeDispatcher } from './model/income/IncomeDispatcher'
import { INCOME_MS } from '../common/GameSettings'
import { NewUnitDataEvent } from '../common/NewUnitDataEvent'
import { detectUnitsIntersections } from './engine/detectUnitsIntersections'
import { ActionsProcessor } from './engine/ActionsProcessor'

export class Game {
    protected players: {
        [socketId: string]: HumanPlayer
    } = {}
    protected gameLoop: GameLoop
    protected map: Map
    protected incomeDispatcher: IncomeDispatcher = new IncomeDispatcher(INCOME_MS)
    protected actionsProcessor: ActionsProcessor

    playersIntersections: Array<number> = []
    townsIntersections: Array<number> = []
    playerUpdates: Array<number> = []

    constructor(public readonly id: string, protected emitter: SocketEmitter) {
        this.map = new Map()
        this.gameLoop = new GameLoop(this.emitter)
        this.actionsProcessor = new ActionsProcessor(this.map)
    }

    getGameDuration(): number {
        return this.gameLoop.gameDuration
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
            status: this.gameLoop.isRunning ? 'running' : 'stopped',
            nextIncome: this.incomeDispatcher.getNextIncomeDelay(),
            players: players,
            currentPlayer: currentPlayer.getPrivatePlayerState(),
            units: units,
            towns: this.map.getTownsState(),
        }
    }

    addPlayer(player: HumanPlayer, socketId: string) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...')
            return
        }
        if (!this.players[socketId]) {
            this.players[socketId] = player
        }
    }

    getPlayers(): HumanPlayer[] {
        return Object.values(this.players)
    }

    addUnit(socketId: string, event: NewUnitDataEvent) {
        if (!this.players[socketId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.players[socketId], event)
    }

    unitEvent(playerId: string, event: UnitAction) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.players[playerId], event)
    }

    playerMessage(playerId: string, message: string) {
        if (!this.players[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.players[playerId], true)
    }

    start() {
        this.emitter.emitInitialGameState(this)
        townAssignation(this.getPlayers(), this.map)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this)
        }
        setTimeout(() => {
            // Let clients be initialized before send this first message
            Object.keys(this.players).forEach((socketId) => {
                // noinspection JSIgnoredPromiseFromCall
                this.emitter.emitMessageToSpecificPlayer(
                    `You are playing as ${this.players[socketId].name}`,
                    socketId,
                    this.players[socketId]
                )
            })
        }, 1500)
    }

    update(): boolean {
        let now = Date.now()
        detectUnitsIntersections(this.players)
        this.playersIntersections.push(Date.now() - now)
        const step1 = Date.now()

        const playersValues = Object.values(this.players)

        playersValues.forEach((player) => {
            player.update(this.map, playersValues)

            const step2 = Date.now()
            this.playerUpdates.push(Date.now() - step1)

            detectTownIntersections(this.map, player)

            const step3 = Date.now() - step2
            this.townsIntersections.push(step3)

            updatePlayerIncome(this.map.getTownsByCountries(), player, this.emitter)
        })
        this.incomeDispatcher.update(this.players)

        const connectedPlayers = playersValues.filter((player) => player.isConnected) // No more player connected
        const deadPlayers = playersValues.filter((player) => player.isDead || !player.isConnected).length
        const oneOrNoAlivePlayers = deadPlayers >= playersValues.length - 1 // one player cannot play alone
        return (
            (connectedPlayers.length === 1 && playersValues.length > 1) ||
            (oneOrNoAlivePlayers && playersValues.length > 1)
        ) // also check if we are playing alone (in dev)
    }

    getConnectedPlayers(): HumanPlayer[] {
        return this.getPlayers().filter((player) => player.isConnected)
    }

    getWinner(): HumanPlayer | undefined {
        const averageStep1 = average(this.playersIntersections) * 1000
        const averageStep2 = average(this.playerUpdates) * 1000
        const averageStep3 = average(this.townsIntersections) * 1000

        console.log(`
            step1: ${averageStep1}
            step2: ${averageStep2}
            step3: ${averageStep3}
        `)

        return Object.values(this.players).find((player) => !player.isDead && player.isConnected)
    }
}

const average = (arr: Array<number>) => arr.reduce((p, c) => p + c, 0) / arr.length
