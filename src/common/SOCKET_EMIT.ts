// From client to server
export const PLAYER_JOIN_LOBBY = 'c-player/joinLobby'
export const PLAYER_FORCE_START = 'c-player/forceStart'
export const PLAYER_NEW_UNIT = 'c-player/newUnit'
export const PLAYER_UNIT = 'c-player/unit'
export const PLAYER_MESSAGE_POST = 'c-player/msg/post'

// From server to client
export const LOBBY_STATE = 's/lobby/state'
export const GAME_STATE_INIT = 's/game/init'
export const GAME_STATE_UPDATE = 's/gameState'
export const GAME_MESSAGE = 's/gameMessage'

// ADMINS
export const ADMIN_NAMESPACE = 'stats'
export const ADMIN_UPDATE = 's/admin/update'
export const ADMIN_ACTION = 'c/admin/action'
export enum AdminActions {
    sendMessage,
}
