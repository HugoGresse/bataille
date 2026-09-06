const STORAGE_KEY = 'bataille.session'

/**
 * Who this tab is, across sockets and reloads. Per tab rather than per browser on purpose: two tabs
 * are two players, and a token shared between them would let one steal the other's seat.
 */
export const readSessionToken = (): string => {
    try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
            return stored
        }
        const token = crypto.randomUUID()
        window.sessionStorage.setItem(STORAGE_KEY, token)
        return token
    } catch {
        // storage blocked: the seat cannot be recovered after a reload, but the game still works
        return crypto.randomUUID()
    }
}

/**
 * Leaving on purpose - the Exit button, back to the menu - is not a crash to recover from: the next
 * page starts as a stranger, so no lobby handshake hands the old seat back.
 */
export const forgetSessionToken = (): void => {
    try {
        window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
        // storage blocked: there was nothing kept to forget
    }
}
