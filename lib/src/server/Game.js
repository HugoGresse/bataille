'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Game = void 0
var HumanPlayer_1 = require('./model/player/HumanPlayer')
var GameLoop_1 = require('./GameLoop')
var Map_1 = require('./model/map/Map')
var townAssignation_1 = require('./utils/townAssignation')
var detectTownIntersections_1 = require('./engine/detectTownIntersections')
var updatePlayerIncome_1 = require('./engine/updatePlayerIncome')
var IncomeDispatcher_1 = require('./model/income/IncomeDispatcher')
var GameSettings_1 = require('../common/GameSettings')
var detectUnitsIntersections_1 = require('./engine/detectUnitsIntersections')
var ActionsProcessor_1 = require('./engine/ActionsProcessor')
var IAPlayer_1 = require('./model/player/IAPlayer')
var Game = /** @class */ (function () {
    function Game(id, emitter) {
        this.id = id
        this.emitter = emitter
        this.players = {}
        this.incomeDispatcher = new IncomeDispatcher_1.IncomeDispatcher(GameSettings_1.INCOME_MS)
        this.playersIntersections = []
        this.townsIntersections = []
        this.playerUpdates = []
        this.map = new Map_1.Map()
        this.gameLoop = new GameLoop_1.GameLoop(this.emitter)
        this.actionsProcessor = new ActionsProcessor_1.ActionsProcessor(this.map)
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
    Game.prototype.getState = function (playerId) {
        var units = Object.values(this.players).reduce(function (acc, player) {
            return acc.concat(player.getUnitsState())
        }, [])
        var players = Object.values(this.players)
            .map(function (player) {
                return player.getPublicPlayerState()
            })
            .sort(function (p1, p2) {
                return p2.income - p1.income
            })
        var currentPlayer = this.players[playerId]
        return {
            status: this.gameLoop.isRunning ? 'running' : 'stopped',
            nextIncome: this.incomeDispatcher.getNextIncomeDelay(),
            players: players,
            currentPlayer: currentPlayer.getPrivatePlayerState(),
            units: units,
            towns: this.map.getTownsState(),
        }
    }
    Game.prototype.addPlayer = function (player, socketId) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...')
            return
        }
        if (!this.players[socketId]) {
            this.players[socketId] = player
            if (player instanceof IAPlayer_1.IAPlayer) {
                player.setActionsProcessor(this.actionsProcessor)
            }
        }
    }
    Game.prototype.getPlayers = function () {
        return Object.values(this.players)
    }
    Game.prototype.addUnit = function (socketId, event) {
        if (!this.players[socketId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.players[socketId], event)
    }
    Game.prototype.unitEvent = function (playerId, event) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.players[playerId], event)
    }
    Game.prototype.playerMessage = function (playerId, message) {
        if (!this.players[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.players[playerId], true)
    }
    Game.prototype.start = function () {
        var _this = this
        this.emitter.emitInitialGameState(this)
        townAssignation_1.townAssignation(this.getPlayers(), this.map)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this)
        }
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
    }
    Game.prototype.update = function () {
        var _this = this
        var now = Date.now()
        detectUnitsIntersections_1.detectUnitsIntersections(this.players)
        this.playersIntersections.push(Date.now() - now)
        var step1 = Date.now()
        var playersValues = Object.values(this.players)
        playersValues.forEach(function (player) {
            player.update(_this.map, playersValues)
            var step2 = Date.now()
            _this.playerUpdates.push(Date.now() - step1)
            detectTownIntersections_1.detectTownIntersections(_this.map, player)
            var step3 = Date.now() - step2
            _this.townsIntersections.push(step3)
            updatePlayerIncome_1.updatePlayerIncome(_this.map.getTownsByCountries(), player, _this.emitter)
        })
        this.incomeDispatcher.update(this.players)
        var connectedHumanPlayers = this.getConnectedHumanPlayers()
        var deadPlayers = playersValues.filter(function (player) {
            return player.isDead || !player.isConnected
        }).length
        var oneOrNoAlivePlayers = deadPlayers >= playersValues.length - 1 // one player cannot play alone
        return connectedHumanPlayers.length === 0 || (oneOrNoAlivePlayers && playersValues.length > 1) // also check if we are playing alone (in dev)
    }
    Game.prototype.getConnectedHumanPlayers = function () {
        return this.getPlayers().filter(function (player) {
            return player.isConnected && player instanceof HumanPlayer_1.HumanPlayer
        })
    }
    Game.prototype.getWinner = function () {
        var averageStep1 = average(this.playersIntersections) * 1000
        var averageStep2 = average(this.playerUpdates) * 1000
        var averageStep3 = average(this.townsIntersections) * 1000
        console.log(
            '\n            step1: ' +
                averageStep1 +
                '\n            step2: ' +
                averageStep2 +
                '\n            step3: ' +
                averageStep3 +
                '\n        '
        )
        return Object.values(this.players).find(function (player) {
            return !player.isDead && player.isConnected
        })
    }
    return Game
})()
exports.Game = Game
var average = function (arr) {
    return (
        arr.reduce(function (p, c) {
            return p + c
        }, 0) / arr.length
    )
}
