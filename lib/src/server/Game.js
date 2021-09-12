'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Game = void 0
var HumanPlayer_1 = require('./model/player/HumanPlayer')
var GameLoop_1 = require('./GameLoop')
var GameState_1 = require('./model/GameState')
var Map_1 = require('./model/map/Map')
var townAssignation_1 = require('./utils/townAssignation')
var ActionsProcessor_1 = require('./engine/ActionsProcessor')
var IAPlayer_1 = require('./model/player/IAPlayer')
var UnitsProcessor_1 = require('./engine/UnitsProcessor')
var GameUpdateProcessor_1 = require('./engine/GameUpdateProcessor')
var IncomeDispatcher_1 = require('./model/income/IncomeDispatcher')
var GameSettings_1 = require('../common/GameSettings')
var Game = /** @class */ (function () {
    function Game(id, emitter) {
        this.id = id
        this.emitter = emitter
        this.playersBySocketIds = {}
        this.playersByIds = {}
        this.players = []
        this.humanPlayers = []
        this.iaPlayers = []
        this.incomeDispatcher = new IncomeDispatcher_1.IncomeDispatcher(GameSettings_1.INCOME_MS)
        this.map = new Map_1.Map()
        this.gameLoop = new GameLoop_1.GameLoop(this.emitter)
        this.unitsProcessor = new UnitsProcessor_1.UnitsProcessor({})
        this.actionsProcessor = new ActionsProcessor_1.ActionsProcessor(this.map, this.unitsProcessor)
        this.gameUpdateProcessor = new GameUpdateProcessor_1.GameUpdateProcessor(
            this.map,
            this.playersByIds,
            this.emitter,
            this.unitsProcessor,
            this.incomeDispatcher
        )
    }
    Game.prototype.getGameStartTime = function () {
        return this.gameLoop.gameStartTS
    }
    Game.prototype.getGameDuration = function () {
        return this.gameLoop.gameDuration
    }
    Game.prototype.export = function () {
        return {
            gameId: this.id,
            map: this.map.export(),
        }
    }
    Game.prototype.getState = function () {
        var updatedUnits = this.gameUpdateProcessor.getLastUpdatedUnitsStates()
        var deletedUnits = this.gameUpdateProcessor.getLastDeletedUnitsStates()
        var players = this.players
            .map(function (player) {
                return player.getPublicPlayerState()
            })
            .sort(function (p1, p2) {
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
    Game.prototype.getPlayerPrivateState = function (socketId) {
        return this.playersBySocketIds[socketId].getPrivatePlayerState()
    }
    Game.prototype.addPlayer = function (player, socketId) {
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
    Game.prototype.getPlayers = function () {
        return this.players
    }
    Game.prototype.addUnit = function (socketId, event) {
        if (!this.playersBySocketIds[socketId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.playersBySocketIds[socketId], event)
    }
    Game.prototype.unitEvent = function (playerId, event) {
        if (!this.playersBySocketIds[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.playersBySocketIds[playerId], event)
    }
    Game.prototype.playerMessage = function (playerId, message) {
        if (!this.playersBySocketIds[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.playersBySocketIds[playerId], true)
    }
    Game.prototype.start = function () {
        var _this = this
        townAssignation_1.townAssignation(this.getPlayers(), this.map, this.unitsProcessor)
        this.emitter.emitInitialGameState(this)
        setTimeout(function () {
            // Let clients be initialized before send this first message
            _this.getConnectedHumanPlayers().forEach(function (player) {
                // noinspection JSIgnoredPromiseFromCall
                _this.emitter.emitMessageToSpecificPlayer(
                    'You are playing as ' + player.name,
                    player.getSocketId(),
                    player
                )
            })
        }, 1500)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this)
        }
    }
    Game.prototype.update = function () {
        this.gameUpdateProcessor.run()
        for (var _i = 0, _a = this.iaPlayers; _i < _a.length; _i++) {
            var player = _a[_i]
            player.update(this.map, this.unitsProcessor.getUnits())
        }
        var connectedHumanPlayers = this.getConnectedHumanPlayers()
        var deadPlayers = this.players.filter(function (player) {
            return player.isDead || !player.isConnected
        }).length
        var oneOrNoAlivePlayers = deadPlayers >= this.players.length - 1 // one player cannot play alone
        return connectedHumanPlayers.length === 0 || (oneOrNoAlivePlayers && this.players.length > 1) // also check if we are playing alone (in dev)
    }
    Game.prototype.getHumanPlayers = function () {
        return this.humanPlayers
    }
    Game.prototype.getConnectedHumanPlayers = function () {
        return this.getHumanPlayers().filter(function (player) {
            return player.isConnected
        })
    }
    Game.prototype.getWinner = function () {
        this.gameUpdateProcessor.printRuntimes()
        return this.players.find(function (player) {
            return !player.isDead && player.isConnected
        })
    }
    return Game
})()
exports.Game = Game
