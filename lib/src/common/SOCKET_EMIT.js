'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AdminActionsTypes =
    exports.ADMIN_ACTION =
    exports.ADMIN_UPDATE =
    exports.ADMIN_NAMESPACE =
    exports.GAME_MESSAGE =
    exports.GAME_STATE_UPDATE =
    exports.GAME_STATE_INIT =
    exports.LOBBY_STATE =
    exports.PLAYER_MESSAGE_POST =
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
exports.PLAYER_MESSAGE_POST = 'c-player/msg/post'
// From server to client
exports.LOBBY_STATE = 's/lobby/state'
exports.GAME_STATE_INIT = 's/game/init'
exports.GAME_STATE_UPDATE = 's/gameState'
exports.GAME_MESSAGE = 's/gameMessage'
// ADMINS
exports.ADMIN_NAMESPACE = 'stats'
exports.ADMIN_UPDATE = 's/admin/update'
exports.ADMIN_ACTION = 'c/admin/action'
var AdminActionsTypes
;(function (AdminActionsTypes) {
    AdminActionsTypes[(AdminActionsTypes['sendMessage'] = 0)] = 'sendMessage'
})((AdminActionsTypes = exports.AdminActionsTypes || (exports.AdminActionsTypes = {})))
