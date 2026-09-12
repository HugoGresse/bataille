import { io, Socket } from 'socket.io-client'
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import {
    AUTH_LOGIN_FINISH,
    AUTH_LOGIN_START,
    AUTH_LOGOUT,
    AUTH_REGISTER_FINISH,
    AUTH_REGISTER_START,
    AUTH_SESSION_CHECK,
    LEADERBOARD_GET,
} from '../../common/SOCKET_EMIT'
import type {
    AuthFinishResult,
    AuthSession,
    LeaderboardEntry,
    LoginStartResult,
    RegisterStartResult,
} from '../../common/auth'
import { SOCKET_URL } from '../game/utils/clientEnv'
import { getAccountSession, setAccountSession } from './accountSession'

export type PasskeyResult = { ok: true; session: AuthSession } | { ok: false; error: string }

const ACK_TIMEOUT_MS = 10_000

/**
 * Home has no game socket: each account action opens one for itself and closes it after. Every
 * ack is bounded so a server gone mid-ceremony fails the action instead of hanging it, and no
 * reconnect: a new connection would not be the one the ceremony started on.
 */
const withSocket = async <T>(run: (socket: Socket) => Promise<T>): Promise<T> => {
    const socket = io(SOCKET_URL, { transports: ['websocket'], ackTimeout: ACK_TIMEOUT_MS, reconnection: false })
    try {
        return await run(socket)
    } finally {
        socket.disconnect()
    }
}

const describeError = (error: unknown): string => {
    if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
            return 'Passkey prompt was cancelled'
        }
        return error.message
    }
    return String(error)
}

export const passkeysSupported = (): boolean => browserSupportsWebAuthn()

export const registerWithPasskey = async (name: string): Promise<PasskeyResult> =>
    withSocket(async (socket) => {
        try {
            const start: RegisterStartResult = await socket.emitWithAck(AUTH_REGISTER_START, name)
            if (!start.ok) {
                return start
            }
            const response = await startRegistration({ optionsJSON: start.options })
            const finish: AuthFinishResult = await socket.emitWithAck(AUTH_REGISTER_FINISH, response)
            if (finish.ok) {
                setAccountSession(finish.session)
            }
            return finish
        } catch (error) {
            return { ok: false, error: describeError(error) }
        }
    })

export const loginWithPasskey = async (): Promise<PasskeyResult> =>
    withSocket(async (socket) => {
        try {
            const start: LoginStartResult = await socket.emitWithAck(AUTH_LOGIN_START)
            if (!start.ok) {
                return start
            }
            const response = await startAuthentication({ optionsJSON: start.options })
            const finish: AuthFinishResult = await socket.emitWithAck(AUTH_LOGIN_FINISH, response)
            if (finish.ok) {
                setAccountSession(finish.session)
            }
            return finish
        } catch (error) {
            return { ok: false, error: describeError(error) }
        }
    })

/** A token the server no longer knows (wiped data, expired) is dropped so the UI stops claiming it */
export const refreshAccountSession = async (): Promise<void> => {
    const session = getAccountSession()
    if (!session) {
        return
    }
    await withSocket(async (socket) => {
        try {
            const resolved = await socket.emitWithAck(AUTH_SESSION_CHECK, session.token)
            if (!resolved) {
                setAccountSession(null)
            } else if (resolved.name !== session.name) {
                setAccountSession({ ...session, name: resolved.name })
            }
        } catch {
            // server unreachable: keep what we have, the join will sort it out
        }
    })
}

export const logoutPasskey = async (): Promise<void> => {
    const session = getAccountSession()
    setAccountSession(null)
    if (!session) {
        return
    }
    await withSocket(async (socket) => {
        try {
            await socket.emitWithAck(AUTH_LOGOUT, session.token)
        } catch {
            // server unreachable: the token is gone from this browser, which is what the user asked
        }
    })
}

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> =>
    withSocket(async (socket) => socket.emitWithAck(LEADERBOARD_GET))
