import type { AuthSession } from '../../common/auth'

const STORAGE_KEY = 'bataille.account'

const listeners = new Set<() => void>()
let cached: AuthSession | null | undefined

const read = (): AuthSession | null => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (!stored) {
            return null
        }
        const parsed = JSON.parse(stored) as Partial<AuthSession>
        if (
            typeof parsed.token === 'string' &&
            typeof parsed.accountId === 'string' &&
            typeof parsed.name === 'string'
        ) {
            return { token: parsed.token, accountId: parsed.accountId, name: parsed.name }
        }
    } catch {
        // storage blocked or corrupt: play as a guest
    }
    return null
}

export const getAccountSession = (): AuthSession | null => {
    if (cached === undefined) {
        cached = read()
    }
    return cached
}

export const setAccountSession = (session: AuthSession | null) => {
    cached = session
    try {
        if (session) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        } else {
            window.localStorage.removeItem(STORAGE_KEY)
        }
    } catch {
        // storage blocked: the session lives as long as the page
    }
    listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: re-renders whoever shows the signed-in state */
export const subscribeAccountSession = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
}
