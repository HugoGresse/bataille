import { afterEach, describe, expect, it, vi } from 'vitest'
import { forgetSessionToken, readSessionToken } from '../src/client/game/session'

const fakeStorage = () => {
    const store = new Map<string, string>()
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
    }
}

describe('the tab session token', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('is kept across reads, and replaced once forgotten', () => {
        vi.stubGlobal('window', { sessionStorage: fakeStorage() })
        const token = readSessionToken()
        expect(readSessionToken()).toBe(token)

        forgetSessionToken()
        const next = readSessionToken()
        expect(next).not.toBe(token)
        expect(readSessionToken()).toBe(next)
    })

    it('still hands out a token with storage blocked, and forgets without complaint', () => {
        vi.stubGlobal('window', {})
        expect(readSessionToken()).toMatch(/^[0-9a-f-]{36}$/)
        expect(() => forgetSessionToken()).not.toThrow()
    })
})
