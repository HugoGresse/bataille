import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    getOrCreatePlayerName,
    isUsablePlayerName,
    pickUsablePlayerName,
    savePlayerName,
} from '../src/client/utils/playerName'
import { LOTR_NAMES } from '../src/client/utils/LOTR_NAMES'
import { getSavedPlayerName, setPlayerNamePersistent } from '../src/client/utils/cookie'

const store = (initial: string | null, picks: string[] = ['Gandalf', 'Frodo']) => {
    let saved = initial
    const pick = vi.fn(() => picks.shift() ?? 'Nobody')
    return { read: () => saved, write: (name: string) => void (saved = name), pick }
}

describe('the guest name', () => {
    it('is picked once and stays the same on every later read', () => {
        const s = store(null)
        expect(getOrCreatePlayerName(s)).toBe('Gandalf')
        expect(getOrCreatePlayerName(s)).toBe('Gandalf')
        expect(getOrCreatePlayerName(s)).toBe('Gandalf')
        expect(s.pick).toHaveBeenCalledTimes(1)
    })

    it('keeps a name the player typed', () => {
        const s = store('Hugo')
        expect(getOrCreatePlayerName(s)).toBe('Hugo')
        expect(s.pick).not.toHaveBeenCalled()
    })

    it('replaces an unusable saved name, and keeps the replacement', () => {
        const s = store('x')
        expect(getOrCreatePlayerName(s)).toBe('Gandalf')
        expect(getOrCreatePlayerName(s)).toBe('Gandalf')
    })

    it('passes over a pick that is too long, so the saved one survives the next read', () => {
        const s = store(null, ['Thorin III Heaume-De-Pierre', 'Thorin II Écu-de-Chêne', 'Éowyn'])
        expect(getOrCreatePlayerName(s)).toBe('Éowyn')
        expect(getOrCreatePlayerName(s)).toBe('Éowyn')
        expect(s.pick).toHaveBeenCalledTimes(3)
    })

    it('falls back to a fixed name rather than looping on a list with nothing usable', () => {
        expect(pickUsablePlayerName(() => 'x')).toBe('Player')
    })

    it('still has plenty of usable names in the real list', () => {
        expect(LOTR_NAMES.filter((name) => isUsablePlayerName(name)).length).toBeGreaterThan(200)
    })

    it('judges names by the account rule', () => {
        expect(isUsablePlayerName('ab')).toBe(true)
        expect(isUsablePlayerName('a')).toBe(false)
        expect(isUsablePlayerName('')).toBe(false)
        expect(isUsablePlayerName(null)).toBe(false)
        expect(isUsablePlayerName('x'.repeat(21))).toBe(false)
        expect(isUsablePlayerName('AI-2')).toBe(false)
        expect(isUsablePlayerName('  padded  ')).toBe(false)
    })

    it('saves only usable names, normalised', () => {
        const s = store('Before')
        expect(savePlayerName('A', s)).toBe(false)
        expect(savePlayerName('', s)).toBe(false)
        expect(s.read()).toBe('Before')
        expect(savePlayerName('  Bob   Smith ', s)).toBe(true)
        expect(s.read()).toBe('Bob Smith')
    })
})

describe('the name cookie', () => {
    afterEach(() => vi.unstubAllGlobals())

    const fakeDocument = () => {
        const jar = new Map<string, string>()
        return {
            set cookie(value: string) {
                const [pair] = value.split(';')
                const [key, ...rest] = pair.split('=')
                jar.set(key.trim(), rest.join('='))
            },
            get cookie() {
                return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
            },
        }
    }

    it('round-trips accents and separators as plain ASCII', () => {
        const doc = fakeDocument()
        vi.stubGlobal('document', doc)
        setPlayerNamePersistent('Théoden; a=b')
        expect(doc.cookie).toMatch(/^bataillePlayerName=[\x21-\x7e]+$/)
        expect(doc.cookie).not.toContain(';')
        expect(getSavedPlayerName()).toBe('Théoden; a=b')
    })

    it('still reads a value written before encoding', () => {
        vi.stubGlobal('document', { cookie: 'other=1; bataillePlayerName=100% Éowyn' })
        expect(getSavedPlayerName()).toBe('100% Éowyn')
    })
})
