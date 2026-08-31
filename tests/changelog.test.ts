import { describe, expect, it } from 'vitest'
import { changelogEntries, hasUnseenChanges, latestVersion, prUrl } from '../src/client/changelog/changelog'

describe('changelog data', () => {
    it('has entries, newest first, in semver patch order', () => {
        expect(changelogEntries.length).toBeGreaterThan(0)
        const asNumbers = changelogEntries.map((entry) => entry.version.split('.').map(Number))
        for (const parts of asNumbers) {
            expect(parts).toHaveLength(3)
            parts.forEach((part) => expect(Number.isInteger(part)).toBe(true))
        }
        for (let i = 1; i < asNumbers.length; i++) {
            const [aMaj, aMin, aPat] = asNumbers[i - 1]
            const [bMaj, bMin, bPat] = asNumbers[i]
            const newerFirst = aMaj > bMaj || (aMaj === bMaj && (aMin > bMin || (aMin === bMin && aPat > bPat)))
            expect(newerFirst).toBe(true)
        }
    })

    it('dates every entry and links PRs when there is one', () => {
        changelogEntries.forEach((entry) => {
            expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(entry.title.length).toBeGreaterThan(3)
            if (entry.pr !== null) {
                expect(prUrl(entry.pr)).toBe(`https://github.com/HugoGresse/bataille/pull/${entry.pr}`)
            }
        })
    })
})

describe('unseen detection', () => {
    const list = [
        { version: '1.2.3', date: '2026-08-31', title: 'B', pr: 2 },
        { version: '1.2.2', date: '2026-08-30', title: 'A', pr: null },
    ]

    it('latest is the first entry', () => {
        expect(latestVersion(list)).toBe('1.2.3')
        expect(latestVersion([])).toBeNull()
    })

    it('glows for a new visitor and for anyone behind, not for someone up to date', () => {
        expect(hasUnseenChanges(list, null)).toBe(true)
        expect(hasUnseenChanges(list, '1.2.2')).toBe(true)
        expect(hasUnseenChanges(list, '1.2.3')).toBe(false)
        expect(hasUnseenChanges([], null)).toBe(false)
    })
})
