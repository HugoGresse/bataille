import { afterEach, describe, expect, it, vi } from 'vitest'
import { readSessionToken } from '../src/client/game/session'

const fakeStorage = () => {
    const store = new Map<string, string>()
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
    }
}

describe('the tab session token', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('is kept across reads within the tab', () => {
        vi.stubGlobal('window', { sessionStorage: fakeStorage() })
        const token = readSessionToken()
        expect(readSessionToken()).toBe(token)
    })

    it('still hands out a token with storage blocked', () => {
        vi.stubGlobal('window', {})
        expect(readSessionToken()).toMatch(/^[0-9a-f-]{36}$/)
    })
})
