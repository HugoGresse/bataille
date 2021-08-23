'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Game = void 0
var GameLoop_1 = require('./GameLoop')
var Map_1 = require('./model/map/Map')
var townAssignation_1 = require('./utils/townAssignation')
var detectTownIntersections_1 = require('./model/detectTownIntersections')
var xyMapToArray_1 = require('./utils/xyMapToArray')
var updatePlayerIncome_1 = require('./model/updatePlayerIncome')
var IncomeDispatcher_1 = require('./model/income/IncomeDispatcher')
var GameSettings_1 = require('../common/GameSettings')
var StickUnit_1 = require('./model/actors/units/StickUnit')
var Position_1 = require('./model/actors/Position')
var UNITS_1 = require('../common/UNITS')
var detectUnitsIntersections_1 = require('./model/detectUnitsIntersections')
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
    }
    Game.prototype.stopLoop = function () {
        var player = Object.values(this.players)[0]
        if (player) {
            var units = player.getUnits()
            xyMapToArray_1.iterateOnXYMap(this.map.getMapTiles(), function (tile, x, y) {
                var _a
                if (tile.isTown) {
                    console.log('town', x, y, (_a = tile.player) === null || _a === void 0 ? void 0 : _a.name)
                }
            })
            xyMapToArray_1.iterateOnXYMap(units, function (unit, x, y) {
                console.log('unit', x, y)
            })
        }
        this.gameLoop.stop()
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
            status: 'running',
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
        }
    }
    Game.prototype.getPlayers = function () {
        return Object.values(this.players)
    }
    Game.prototype.addUnit = function (socketId, _a) {
        var x = _a.x,
            y = _a.y
        if (!this.players[socketId] || !this.gameLoop.isRunning) {
            return
        }
        var player = this.players[socketId]
        if (player.money >= UNITS_1.UnitsType.Stick) {
            var position = new Position_1.Position(x + UNITS_1.TILE_WIDTH_HEIGHT / 2, y + UNITS_1.TILE_WIDTH_HEIGHT / 2)
            var gridPosition = position.getRoundedPosition()
            var town = this.map.getTileAt(gridPosition.x, gridPosition.y)
            if (!town || town.player.id !== player.id) {
                return
            }
            var unit = new StickUnit_1.StickUnit(player, position)
            var unitCreated = player.addUnit(unit, gridPosition.x, gridPosition.y)
            if (unitCreated) {
                player.spendMoney(UNITS_1.UnitsType.Stick)
            }
        }
    }
    Game.prototype.unitEvent = function (playerId, event) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.players[playerId].unitAction(event)
    }
    Game.prototype.playerMessage = function (playerId, message) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return
        }
        this.emitter.emitMessage(message, this.players[playerId], true)
    }
    Game.prototype.start = function (onGameEnded) {
        this.emitter.emitInitialGameState(this)
        townAssignation_1.townAssignation(this.getPlayers(), this.map)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this, onGameEnded)
        }
    }
    Game.prototype.update = function () {
        var _this = this
        var now = Date.now()
        detectUnitsIntersections_1.detectUnitsIntersections(this.players)
        this.playersIntersections.push(Date.now() - now)
        var step1 = Date.now()
        var playersValues = Object.values(this.players)
        playersValues.forEach(function (player) {
            player.update(_this.map)
            var step2 = Date.now()
            _this.playerUpdates.push(Date.now() - step1)
            detectTownIntersections_1.detectTownIntersections(_this.map, player)
            var step3 = Date.now() - step2
            _this.townsIntersections.push(step3)
            updatePlayerIncome_1.updatePlayerIncome(_this.map.getTownsByCountries(), player, _this.emitter)
        })
        this.incomeDispatcher.update(this.players)
        var connectedPlayers = playersValues.filter(function (player) {
            return player.isConnected
        }) // No more player connected
        var deadPlayers = playersValues.filter(function (player) {
            return player.isDead
        }).length
        var oneOrNoAlivePlayers = deadPlayers >= playersValues.length - 1 // one player cannot play alone
        return (
            (connectedPlayers.length === 1 && playersValues.length > 1) ||
            (oneOrNoAlivePlayers && playersValues.length > 1)
        ) // also check if we are playing alone (in dev)
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
            return !player.isDead
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
