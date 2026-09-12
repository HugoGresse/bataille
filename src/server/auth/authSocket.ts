import { Socket } from 'socket.io'
import {
    AUTH_LOGIN_FINISH,
    AUTH_LOGIN_START,
    AUTH_LOGOUT,
    AUTH_REGISTER_FINISH,
    AUTH_REGISTER_START,
    AUTH_SESSION_CHECK,
} from '../../common/SOCKET_EMIT'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '../../common/auth'
import { AuthService } from './AuthService'

/** Every auth event answers through its ack: a missing ack means a client that cannot hear the answer */
export const answer = (ack: unknown, result: unknown) => {
    if (typeof ack === 'function') {
        ack(result)
    }
}

export const registerAuthHandlers = (socket: Socket, auth: AuthService) => {
    socket.on(AUTH_REGISTER_START, async (name: unknown, ack: unknown) => {
        answer(ack, await auth.startRegistration(typeof name === 'string' ? name : ''))
    })
    socket.on(AUTH_REGISTER_FINISH, async (response: RegistrationResponseJSON, ack: unknown) => {
        answer(ack, await auth.finishRegistration(response))
    })
    socket.on(AUTH_LOGIN_START, async (ack: unknown) => {
        answer(ack, await auth.startLogin())
    })
    socket.on(AUTH_LOGIN_FINISH, async (response: AuthenticationResponseJSON, ack: unknown) => {
        answer(ack, await auth.finishLogin(response))
    })
    socket.on(AUTH_SESSION_CHECK, (token: unknown, ack: unknown) => {
        answer(ack, auth.resolveSession(token))
    })
    socket.on(AUTH_LOGOUT, (token: unknown, ack: unknown) => {
        if (typeof token === 'string') {
            auth.logout(token)
        }
        answer(ack, true)
    })
}
