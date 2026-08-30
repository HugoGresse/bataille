import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createIpHasher } from '../src/server/stats/ipHash'
import { clearCountryCache, isPrivateAddress, lookupCountry, readCountryCode } from '../src/server/utils/geoLookup'

let tempDir: string

beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bataille-ip-'))
    delete process.env.STATS_IP_SALT
    delete process.env.GEO_LOOKUP_URL
    clearCountryCache()
})

afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.STATS_IP_SALT
    delete process.env.GEO_LOOKUP_URL
})

describe('createIpHasher', () => {
    it('never returns the address, and is stable for the same one', () => {
        const hash = createIpHasher(path.join(tempDir, 'ip-salt'))
        const first = hash('82.1.2.3')

        expect(first).not.toContain('82.1.2.3')
        expect(first).toMatch(/^[0-9a-f]{16}$/)
        expect(hash('82.1.2.3')).toBe(first)
        expect(hash('82.1.2.4')).not.toBe(first)
    })

    it('keeps the same salt across restarts so a host stays one host', () => {
        const saltFile = path.join(tempDir, 'ip-salt')
        const before = createIpHasher(saltFile)('82.1.2.3')

        // a fresh process reading the salt back off disk
        expect(createIpHasher(saltFile)('82.1.2.3')).toBe(before)
        expect(fs.existsSync(saltFile)).toBe(true)
    })

    it('is not reversible by anyone without the salt', () => {
        const mine = createIpHasher(path.join(tempDir, 'ip-salt'))
        const theirs = createIpHasher(path.join(tempDir, 'other-salt'))

        expect(theirs('82.1.2.3')).not.toBe(mine('82.1.2.3'))
    })

    it('prefers an explicitly configured salt', () => {
        process.env.STATS_IP_SALT = 'a-known-secret'
        const configured = createIpHasher(path.join(tempDir, 'ip-salt'))('82.1.2.3')

        delete process.env.STATS_IP_SALT
        expect(createIpHasher(path.join(tempDir, 'ip-salt'))('82.1.2.3')).not.toBe(configured)
    })
})

describe('isPrivateAddress', () => {
    it('keeps addresses that never leave the network out of the lookup', () => {
        for (const address of [
            '127.0.0.1',
            '10.0.0.4',
            '192.168.1.20',
            '172.16.0.1',
            '172.31.255.255',
            '169.254.1.1',
        ]) {
            expect(isPrivateAddress(address), address).toBe(true)
        }
        for (const address of ['::1', '::', 'unknown', '', 'fd00::1', 'fe80::1']) {
            expect(isPrivateAddress(address), address).toBe(true)
        }
    })

    it('treats routable addresses as lookupable', () => {
        for (const address of ['82.1.2.3', '172.32.0.1', '8.8.8.8', '2a01:e0a::1']) {
            expect(isPrivateAddress(address), address).toBe(false)
        }
    })
})

describe('readCountryCode', () => {
    it('accepts the spellings the free providers use', () => {
        expect(readCountryCode({ country_code: 'fr' })).toBe('FR')
        expect(readCountryCode({ countryCode: 'US' })).toBe('US')
        expect(readCountryCode({ country: 'JP' })).toBe('JP')
    })

    it('rejects anything that is not a two letter code', () => {
        expect(readCountryCode({ country: 'France' })).toBeUndefined()
        expect(readCountryCode({ success: false, country_code: 'FR' })).toBeUndefined()
        expect(readCountryCode({})).toBeUndefined()
        expect(readCountryCode(null)).toBeUndefined()
    })
})

describe('lookupCountry', () => {
    it('asks the service once per address and reuses the answer', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: 'FR' }) })
        vi.stubGlobal('fetch', fetchMock)

        expect(await lookupCountry('82.1.2.3')).toBe('FR')
        expect(await lookupCountry('82.1.2.3')).toBe('FR')
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('never sends a private address anywhere', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        expect(await lookupCountry('192.168.0.10')).toBeUndefined()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('resolves to no country when the service fails, rather than throwing', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
        await expect(lookupCountry('82.1.2.3')).resolves.toBeUndefined()

        clearCountryCache()
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
        await expect(lookupCountry('82.1.2.4')).resolves.toBeUndefined()
    })

    it('can be switched off entirely', async () => {
        process.env.GEO_LOOKUP_URL = ''
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        expect(await lookupCountry('82.1.2.3')).toBeUndefined()
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
