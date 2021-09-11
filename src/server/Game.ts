import { HumanPlayer } from './model/player/HumanPlayer'
import { GameLoop } from './GameLoop'
import { GameState, PrivatePlayerState } from './model/GameState'
import { UnitAction } from '../common/UnitAction'
import { Map } from './model/map/Map'
import { SocketEmitter } from './SocketEmitter'
import { ExportType } from './model/types/ExportType'
import { townAssignation } from './utils/townAssignation'
import { NewUnitDataEvent } from '../common/NewUnitDataEvent'
import { ActionsProcessor } from './engine/ActionsProcessor'
import { AbstractPlayer } from './model/player/AbstractPlayer'
import { IAPlayer } from './model/player/IAPlayer'
import { UnitsProcessor } from './engine/UnitsProcessor'
import { GameUpdateProcessor } from './engine/GameUpdateProcessor'
import { PlayersById } from './model/types/PlayersById'
import { IncomeDispatcher } from './model/income/IncomeDispatcher'
import { INCOME_MS } from '../common/GameSettings'

export class Game {
    private playersBySocketIds: PlayersById = {}
    private playersByIds: PlayersById = {}
    private players: AbstractPlayer[] = []
    private humanPlayers: HumanPlayer[] = []
    private iaPlayers: IAPlayer[] = []
    private gameLoop: GameLoop
    private map: Map
    private unitsProcessor: UnitsProcessor
    private actionsProcessor: ActionsProcessor
    private gameUpdateProcessor: GameUpdateProcessor
    protected incomeDispatcher: IncomeDispatcher = new IncomeDispatcher(INCOME_MS)

    constructor(public readonly id: string, protected emitter: SocketEmitter) {
        this.map = new Map()
        this.gameLoop = new GameLoop(this.emitter)
        this.unitsProcessor = new UnitsProcessor({})
        this.actionsProcessor = new ActionsProcessor(this.map, this.unitsProcessor)
        this.gameUpdateProcessor = new GameUpdateProcessor(
            this.map,
            this.playersByIds,
            this.emitter,
            this.unitsProcessor,
            this.incomeDispatcher
        )
    }

    getGameStartTime(): number {
        return this.gameLoop.gameStartTS
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

    getState(): GameState {
        const updatedUnits = this.gameUpdateProcessor.getLastUpdatedUnits().map((unit) => unit.getPublicState())
        const deletedUnits = this.gameUpdateProcessor.getLastDeletedUnits().map((unit) => unit.getPublicState())

        const players = this.players
            .map((player) => player.getPublicPlayerState())
            .sort((p1, p2) => {
                return p2.income - p1.income
            })

        return {
            status: this.gameLoop.isRunning ? 'running' : 'stopped',
            nextIncome: this.incomeDispatcher.getNextIncomeDelay(),
            players: players,
            units: {
                updated: updatedUnits,
                deleted: deletedUnits,
            },
            towns: this.map.getTownsState(),
        }
    }

    getPlayerPrivateState(socketId: string): PrivatePlayerState {
        return this.playersBySocketIds[socketId].getPrivatePlayerState()
    }

    addPlayer(player: AbstractPlayer, socketId: string) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...')
            return
        }
        if (!this.playersBySocketIds[socketId]) {
            this.playersByIds[player.id] = player
            this.playersBySocketIds[socketId] = player
            this.players.push(player)
            if (player instanceof IAPlayer) {
                player.setProcessor(this.actionsProcessor, this.unitsProcessor)
                this.iaPlayers.push(player)
            } else if (player instanceof HumanPlayer) this.humanPlayers.push(player)
        }
    }

    getPlayers(): AbstractPlayer[] {
        return this.players
    }

    addUnit(socketId: string, event: NewUnitDataEvent) {
        if (!this.playersBySocketIds[socketId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.playersBySocketIds[socketId], event)
    }

    unitEvent(playerId: string, event: UnitAction) {
        if (!this.playersBySocketIds[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.playersBySocketIds[playerId], event)
    }

    playerMessage(playerId: string, message: string) {
        if (!this.playersBySocketIds[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.playersBySocketIds[playerId], true)
    }

    start() {
        townAssignation(this.getPlayers(), this.map, this.unitsProcessor)
        this.emitter.emitInitialGameState(this)
        setTimeout(() => {
            // Let clients be initialized before send this first message
            this.getConnectedHumanPlayers().forEach((player) => {
                // noinspection JSIgnoredPromiseFromCall
                this.emitter.emitMessageToSpecificPlayer(
                    `You are playing as ${player.name}`,
                    player.getSocketId(),
                    player
                )
            })
        }, 1500)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this)
        }
    }

    update(): boolean {
        this.gameUpdateProcessor.run()

        for (const player of this.iaPlayers) {
            player.update(this.map, this.unitsProcessor.getUnits())
        }

        const connectedHumanPlayers = this.getConnectedHumanPlayers()
        const deadPlayers = this.players.filter((player) => player.isDead || !player.isConnected).length
        const oneOrNoAlivePlayers = deadPlayers >= this.players.length - 1 // one player cannot play alone
        return connectedHumanPlayers.length === 0 || (oneOrNoAlivePlayers && this.players.length > 1) // also check if we are playing alone (in dev)
    }

    getHumanPlayers(): HumanPlayer[] {
        return this.humanPlayers
    }

    getConnectedHumanPlayers(): HumanPlayer[] {
        return this.getHumanPlayers().filter((player) => player.isConnected)
    }

    getWinner(): AbstractPlayer | undefined {
        this.gameUpdateProcessor.printRuntimes()
        return this.players.find((player) => !player.isDead && player.isConnected)
    }
}
