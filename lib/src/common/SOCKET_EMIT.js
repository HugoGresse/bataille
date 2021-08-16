"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_STATE_UPDATE = exports.GAME_STATE_INIT = exports.LOBBY_STATE = exports.GAME_CLEAR = exports.PLAYER_UNIT = exports.PLAYER_NEW_UNIT = exports.PLAYER_FORCE_START = exports.PLAYER_JOIN_LOBBY = void 0;
// From client to server
exports.PLAYER_JOIN_LOBBY = 'c-playerJoinLobby';
exports.PLAYER_FORCE_START = 'c-playerForceStart';
exports.PLAYER_NEW_UNIT = 'c-playerNewUnit';
exports.PLAYER_UNIT = 'c-player/unit';
exports.GAME_CLEAR = 'c-clearGame';
// From server to client
exports.LOBBY_STATE = 's/lobby/state';
exports.GAME_STATE_INIT = 's/game/init';
exports.GAME_STATE_UPDATE = 's-gameState';
