import { describe, expect, it, vi } from 'vitest'
import { getOrCreatePlayerName, isUsablePlayerName } from '../src/client/utils/playerName'

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

    it('judges names by the shared length bounds', () => {
        expect(isUsablePlayerName('ab')).toBe(true)
        expect(isUsablePlayerName('a')).toBe(false)
        expect(isUsablePlayerName('')).toBe(false)
        expect(isUsablePlayerName(null)).toBe(false)
        expect(isUsablePlayerName('x'.repeat(21))).toBe(false)
    })
})
