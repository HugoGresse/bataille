'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.GAME_STATE_UPDATE =
    exports.GAME_STATE_INIT =
    exports.LOBBY_STATE =
    exports.PLAYER_UNIT =
    exports.PLAYER_NEW_UNIT =
    exports.PLAYER_FORCE_START =
    exports.PLAYER_JOIN_LOBBY =
        void 0
// From client to server
exports.PLAYER_JOIN_LOBBY = 'c-player/joinLobby'
exports.PLAYER_FORCE_START = 'c-player/forceStart'
exports.PLAYER_NEW_UNIT = 'c-player/newUnit'
exports.PLAYER_UNIT = 'c-player/unit'
// From server to client
exports.LOBBY_STATE = 's/lobby/state'
exports.GAME_STATE_INIT = 's/game/init'
exports.GAME_STATE_UPDATE = 's/gameState'
