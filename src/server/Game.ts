import { HumanPlayer } from './model/player/HumanPlayer'
import { GameLoop } from './GameLoop'
import { GameState, GameStatus, PrivatePlayerState, PrivatePlayerStateUpdate } from './model/GameState'
import { UnitAction } from '../common/UnitAction'
import { GameMap } from './model/map/GameMap'
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
import { findDominantPlayer, townsToWin } from './engine/domination'
import { surrenderPlayer } from './engine/surrender'

export class Game {
    private playersBySocketIds: PlayersById = {}
    private playersByIds: PlayersById = {}
    private players: AbstractPlayer[] = []
    private humanPlayers: HumanPlayer[] = []
    private iaPlayers: IAPlayer[] = []
    private gameLoop: GameLoop
    private map: GameMap
    private unitsProcessor: UnitsProcessor
    private actionsProcessor: ActionsProcessor
    private gameUpdateProcessor: GameUpdateProcessor
    protected incomeDispatcher: IncomeDispatcher = new IncomeDispatcher(INCOME_MS)
    /** Fixed by the map, so it is read once rather than on every tick of the loop */
    private readonly townCount: number
    /** Set the moment somebody holds enough of the map, and read back as the winner */
    private dominantPlayer: AbstractPlayer | null = null

    constructor(
        public readonly id: string,
        protected emitter: SocketEmitter
    ) {
        this.map = new GameMap()
        this.gameLoop = new GameLoop(this.emitter, id)
        this.unitsProcessor = new UnitsProcessor()
        this.actionsProcessor = new ActionsProcessor(this.map, this.unitsProcessor)
        this.gameUpdateProcessor = new GameUpdateProcessor(
            this.map,
            this.playersByIds,
            this.emitter,
            this.unitsProcessor,
            this.incomeDispatcher
        )
        this.townCount = this.map.getTowns().length
    }

    getTownCount(): number {
        return this.townCount
    }

    /** Towns one player has to hold to take the game outright */
    getTownsToWin(): number {
        return townsToWin(this.townCount)
    }

    /** The player the map was called for, once one is that far ahead */
    getDominantPlayer(): AbstractPlayer | null {
        return this.dominantPlayer
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
            townsToWin: this.getTownsToWin(),
        }
    }

    getState(): GameState {
        const updatedUnits = this.gameUpdateProcessor.getLastUpdatedUnitsStates()
        const deletedUnits = this.gameUpdateProcessor.getLastDeletedUnitsStates()

        const players = this.players
            .map((player) => player.getPublicPlayerState())
            .sort((p1, p2) => {
                return p2.i - p1.i
            })

        return {
            s: this.gameLoop.isRunning ? GameStatus.running : GameStatus.stopped,
            ni: this.incomeDispatcher.getNextIncomeDelay(),
            ps: players,
            u: {
                updated: updatedUnits,
                deleted: deletedUnits,
            },
            t: this.gameUpdateProcessor.getLastTownsStates(),
        }
    }

    getPlayerPrivateState(socketId: string): PrivatePlayerState {
        return this.playersBySocketIds[socketId].getPrivatePlayerState()
    }
    getPlayerPrivateStateUpdate(socketId: string): PrivatePlayerStateUpdate {
        return this.playersBySocketIds[socketId].getPrivatePlayerStateUpdate()
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
        if (!this.playersBySocketIds[socketId] || this.playersBySocketIds[socketId].isOut || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.playersBySocketIds[socketId], event)
    }

    unitEvent(playerId: string, event: UnitAction) {
        if (!this.playersBySocketIds[playerId] || this.playersBySocketIds[playerId].isOut || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.playersBySocketIds[playerId], event)
    }

    /** The player gives up: they stay connected to watch, but nothing of theirs is left in play */
    surrender(socketId: string) {
        const player = this.playersBySocketIds[socketId]
        if (!player || !this.gameLoop.isRunning) {
            return
        }
        const outcome = surrenderPlayer(player, this.map, this.unitsProcessor, this.players, this.emitter)
        if (!outcome) {
            return
        }
        this.gameUpdateProcessor.enqueue(outcome)
        this.gameUpdateProcessor.refreshTownCounts()
        this.emitter.emitMessage(`${player.name} surrendered`, player)
    }

    playerMessage(playerId: string, message: string) {
        if (!this.playersBySocketIds[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.playersBySocketIds[playerId], true)
    }

    start() {
        townAssignation(this.getPlayers(), this.map, this.unitsProcessor)
        // The starting towns are handed out here, before the loop has ever run: without this the
        // standings would open on zeroes and only catch up at the first capture.
        this.gameUpdateProcessor.refreshTownCounts()
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

        // Holding almost the whole map ends it: the stragglers left over are not a game any more
        this.dominantPlayer = findDominantPlayer(this.players, this.townCount)
        if (this.dominantPlayer) {
            return true
        }

        const connectedHumanPlayers = this.getConnectedHumanPlayers()
        const deadPlayers = this.players.filter((player) => player.isOut || !player.isConnected).length
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
        return this.dominantPlayer ?? this.players.find((player) => !player.isOut && player.isConnected)
    }
}
