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

type Ack<T> = (result: T) => void

const isFunction = (value: unknown): value is (...args: never[]) => void => typeof value === 'function'

/** Every auth event answers through its ack: a missing ack means a client that cannot hear the answer */
export const registerAuthHandlers = (socket: Socket, auth: AuthService) => {
    socket.on(AUTH_REGISTER_START, async (name: unknown, ack: unknown) => {
        if (!isFunction(ack)) return
        ;(ack as Ack<unknown>)(await auth.startRegistration(socket.id, typeof name === 'string' ? name : ''))
    })
    socket.on(AUTH_REGISTER_FINISH, async (response: RegistrationResponseJSON, ack: unknown) => {
        if (!isFunction(ack)) return
        ;(ack as Ack<unknown>)(await auth.finishRegistration(socket.id, response))
    })
    socket.on(AUTH_LOGIN_START, async (ack: unknown) => {
        if (!isFunction(ack)) return
        ;(ack as Ack<unknown>)(await auth.startLogin(socket.id))
    })
    socket.on(AUTH_LOGIN_FINISH, async (response: AuthenticationResponseJSON, ack: unknown) => {
        if (!isFunction(ack)) return
        ;(ack as Ack<unknown>)(await auth.finishLogin(socket.id, response))
    })
    socket.on(AUTH_SESSION_CHECK, (token: unknown, ack: unknown) => {
        if (!isFunction(ack)) return
        ;(ack as Ack<unknown>)(auth.resolveSession(typeof token === 'string' ? token : null))
    })
    socket.on(AUTH_LOGOUT, (token: unknown, ack: unknown) => {
        if (typeof token === 'string') {
            auth.logout(token)
        }
        if (isFunction(ack)) {
            ;(ack as Ack<boolean>)(true)
        }
    })
    socket.on('disconnect', () => auth.forget(socket.id))
}
