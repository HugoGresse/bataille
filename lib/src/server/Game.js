"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
var GameLoop_1 = require("./GameLoop");
var Map_1 = require("./model/map/Map");
var townAssignation_1 = require("./utils/townAssignation");
var detectIntersection_1 = require("./model/detectIntersection");
var xyMapToArray_1 = require("./utils/xyMapToArray");
var updatePlayerIncome_1 = require("./model/updatePlayerIncome");
var IncomeDispatcher_1 = require("./model/income/IncomeDispatcher");
var GameSettings_1 = require("../common/GameSettings");
var StickUnit_1 = require("./model/actors/units/StickUnit");
var Position_1 = require("./model/actors/Position");
var UNITS_1 = require("../common/UNITS");
var detectUnitsIntersections_1 = require("./model/detectUnitsIntersections");
var Game = /** @class */ (function () {
    function Game(id, emitter) {
        this.id = id;
        this.emitter = emitter;
        this.players = {};
        this.incomeDispatcher = new IncomeDispatcher_1.IncomeDispatcher(GameSettings_1.INCOME_MS);
        this.map = new Map_1.Map();
        this.gameLoop = new GameLoop_1.GameLoop(this.emitter);
    }
    Game.prototype.stopLoop = function () {
        var player = Object.values(this.players)[0];
        if (player) {
            var units = player.getUnits();
            xyMapToArray_1.iterateOnXYMap(this.map.getMapTiles(), function (tile, x, y) {
                var _a;
                if (tile.isTown) {
                    console.log('town', x, y, (_a = tile.player) === null || _a === void 0 ? void 0 : _a.name);
                }
            });
            xyMapToArray_1.iterateOnXYMap(units, function (unit, x, y) {
                console.log('unit', x, y);
            });
        }
        this.gameLoop.stop();
    };
    Game.prototype.export = function () {
        return {
            gameId: this.id,
            map: this.map.export(),
        };
    };
    Game.prototype.getState = function (playerId) {
        var units = Object.values(this.players).reduce(function (acc, player) {
            return acc.concat(player.getUnitsState());
        }, []);
        var players = Object.values(this.players).map(function (player) { return player.getPublicPlayerState(); });
        var currentPlayer = this.players[playerId];
        return {
            status: 'running',
            nextIncome: this.incomeDispatcher.getNextIncomeDelay(),
            players: players,
            currentPlayer: currentPlayer.getPrivatePlayerState(),
            units: units,
            towns: this.map.getTownsState(),
        };
    };
    Game.prototype.addPlayer = function (player, socketId) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...');
            return;
        }
        if (!this.players[socketId]) {
            this.players[socketId] = player;
        }
    };
    Game.prototype.getPlayers = function () {
        return Object.values(this.players);
    };
    Game.prototype.addUnit = function (socketId, _a) {
        var x = _a.x, y = _a.y;
        if (!this.players[socketId] || !this.gameLoop.isRunning) {
            return;
        }
        var player = this.players[socketId];
        if (player.money >= UNITS_1.UnitsType.Stick) {
            var position = new Position_1.Position(x + UNITS_1.TILE_WIDTH_HEIGHT / 2, y + UNITS_1.TILE_WIDTH_HEIGHT / 2);
            var gridPosition = position.getRoundedPosition();
            var town = this.map.getTownAt(gridPosition.x, gridPosition.y);
            if (!town || town.player.id !== player.id) {
                return;
            }
            var unit = new StickUnit_1.StickUnit(player, position);
            var unitCreated = player.addUnit(unit, gridPosition.x, gridPosition.y);
            if (unitCreated) {
                player.spendMoney(UNITS_1.UnitsType.Stick);
            }
        }
    };
    Game.prototype.unitEvent = function (playerId, event) {
        if (!this.players[playerId] || !this.gameLoop.isRunning) {
            return;
        }
        this.players[playerId].unitAction(event);
    };
    Game.prototype.start = function (onGameEnded) {
        this.emitter.emitInitialGameState(this);
        townAssignation_1.townAssignation(this.getPlayers(), this.map);
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this, onGameEnded);
        }
    };
    Game.prototype.update = function () {
        var _this = this;
        detectUnitsIntersections_1.detectUnitsIntersections(this.players);
        Object.values(this.players).forEach(function (player) {
            player.update();
            detectIntersection_1.detectIntersection(_this.map, player);
            updatePlayerIncome_1.updatePlayerIncome(_this.map.getTownsByCountries(), player);
        });
        this.incomeDispatcher.update(this.players);
        var connectedPlayers = Object.values(this.players).filter(function (player) { return player.isConnected; });
        return connectedPlayers.length === 0; // No more player connected
    };
    return Game;
}());
exports.Game = Game;
