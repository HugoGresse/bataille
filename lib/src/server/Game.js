'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Game = void 0
const HumanPlayer_1 = require('./model/player/HumanPlayer')
const GameLoop_1 = require('./GameLoop')
const GameState_1 = require('./model/GameState')
const GameMap_1 = require('./model/map/GameMap')
const townAssignation_1 = require('./utils/townAssignation')
const ActionsProcessor_1 = require('./engine/ActionsProcessor')
const IAPlayer_1 = require('./model/player/IAPlayer')
const UnitsProcessor_1 = require('./engine/UnitsProcessor')
const GameUpdateProcessor_1 = require('./engine/GameUpdateProcessor')
const IncomeDispatcher_1 = require('./model/income/IncomeDispatcher')
const GameSettings_1 = require('../common/GameSettings')
class Game {
    constructor(id, emitter) {
        this.id = id
        this.emitter = emitter
        this.playersBySocketIds = {}
        this.playersByIds = {}
        this.players = []
        this.humanPlayers = []
        this.iaPlayers = []
        this.incomeDispatcher = new IncomeDispatcher_1.IncomeDispatcher(GameSettings_1.INCOME_MS)
        this.map = new GameMap_1.GameMap()
        this.gameLoop = new GameLoop_1.GameLoop(this.emitter)
        this.unitsProcessor = new UnitsProcessor_1.UnitsProcessor()
        this.actionsProcessor = new ActionsProcessor_1.ActionsProcessor(this.map, this.unitsProcessor)
        this.gameUpdateProcessor = new GameUpdateProcessor_1.GameUpdateProcessor(
            this.map,
            this.playersByIds,
            this.emitter,
            this.unitsProcessor,
            this.incomeDispatcher
        )
    }
    getGameStartTime() {
        return this.gameLoop.gameStartTS
    }
    getGameDuration() {
        return this.gameLoop.gameDuration
    }
    export() {
        return {
            gameId: this.id,
            map: this.map.export(),
        }
    }
    getState() {
        const updatedUnits = this.gameUpdateProcessor.getLastUpdatedUnitsStates()
        const deletedUnits = this.gameUpdateProcessor.getLastDeletedUnitsStates()
        const players = this.players
            .map((player) => player.getPublicPlayerState())
            .sort((p1, p2) => {
                return p2.income - p1.income
            })
        return {
            status: this.gameLoop.isRunning ? GameState_1.GameStatus.running : GameState_1.GameStatus.stopped,
            nextIncome: this.incomeDispatcher.getNextIncomeDelay(),
            players: players,
            units: {
                updated: updatedUnits,
                deleted: deletedUnits,
            },
            towns: this.gameUpdateProcessor.getLastTownsStates(),
        }
    }
    getPlayerPrivateState(socketId) {
        return this.playersBySocketIds[socketId].getPrivatePlayerState()
    }
    addPlayer(player, socketId) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...')
            return
        }
        if (!this.playersBySocketIds[socketId]) {
            this.playersByIds[player.id] = player
            this.playersBySocketIds[socketId] = player
            this.players.push(player)
            if (player instanceof IAPlayer_1.IAPlayer) {
                player.setProcessor(this.actionsProcessor, this.unitsProcessor)
                this.iaPlayers.push(player)
            } else if (player instanceof HumanPlayer_1.HumanPlayer) this.humanPlayers.push(player)
        }
    }
    getPlayers() {
        return this.players
    }
    addUnit(socketId, event) {
        if (!this.playersBySocketIds[socketId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.playersBySocketIds[socketId], event)
    }
    unitEvent(playerId, event) {
        if (!this.playersBySocketIds[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.playersBySocketIds[playerId], event)
    }
    playerMessage(playerId, message) {
        if (!this.playersBySocketIds[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.playersBySocketIds[playerId], true)
    }
    start() {
        townAssignation_1.townAssignation(this.getPlayers(), this.map, this.unitsProcessor)
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
    update() {
        this.gameUpdateProcessor.run()
        for (const player of this.iaPlayers) {
            player.update(this.map, this.unitsProcessor.getUnits())
        }
        const connectedHumanPlayers = this.getConnectedHumanPlayers()
        const deadPlayers = this.players.filter((player) => player.isDead || !player.isConnected).length
        const oneOrNoAlivePlayers = deadPlayers >= this.players.length - 1 // one player cannot play alone
        return connectedHumanPlayers.length === 0 || (oneOrNoAlivePlayers && this.players.length > 1) // also check if we are playing alone (in dev)
    }
    getHumanPlayers() {
        return this.humanPlayers
    }
    getConnectedHumanPlayers() {
        return this.getHumanPlayers().filter((player) => player.isConnected)
    }
    getWinner() {
        this.gameUpdateProcessor.printRuntimes()
        return this.players.find((player) => !player.isDead && player.isConnected)
    }
}
exports.Game = Game
