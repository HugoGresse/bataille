// From client to server
export const PLAYER_JOIN_LOBBY = 'c-player/joinLobby'
export const PLAYER_FORCE_START = 'c-player/forceStart'
export const PLAYER_LOBBY_WAIT_FOR_HUMAN = 'c-player/waitForHuman'
export const PLAYER_NEW_UNIT = 'c-player/newUnit'
export const PLAYER_UNIT = 'c-player/unit'
export const PLAYER_MESSAGE_POST = 'c-player/msg/post'
export const PLAYER_SURRENDER = 'c-player/surrender'
export const PLAYER_REJOIN = 'c-player/rejoin'
/** An admin watching a game without a seat: view-only, gated by the admin key */
export const PLAYER_SPECTATE = 'c-player/spectate'

// From server to client
export const LOBBY_STATE = 's/lobby/state'
export const GAME_STATE_INIT = 's/game/init'
export const GAME_STATE_UPDATE = 's/gameState'
export const GAME_MESSAGE = 's/gameMessage'
export const GAME_REJOIN_FAILED = 's/game/rejoinFailed'
/** A lobby join from a tab that still holds a seat: the seat is offered, not forced */
export const GAME_SEAT_OFFERED = 's/game/seatOffered'

// ADMINS
export const ADMIN_NAMESPACE = 'stats'
export const ADMIN_UPDATE = 's/admin/update'
export const ADMIN_STATS = 's/admin/stats'
export const ADMIN_ACTION = 'c/admin/action'
export enum AdminActionsTypes {
    sendMessage,
    getStats,
}

// AUTH (passkeys): each carries an ack callback with the result
export const AUTH_REGISTER_START = 'c-auth/register/start'
export const AUTH_REGISTER_FINISH = 'c-auth/register/finish'
export const AUTH_LOGIN_START = 'c-auth/login/start'
export const AUTH_LOGIN_FINISH = 'c-auth/login/finish'
export const AUTH_SESSION_CHECK = 'c-auth/session/check'
export const AUTH_LOGOUT = 'c-auth/logout'

// LEADERBOARD: ack callback with the entries
export const LEADERBOARD_GET = 'c-leaderboard/get'
