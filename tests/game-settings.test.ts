import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * GameSettings is imported by the browser bundle as well as the server. The browser has no
 * `process`: reading the environment unguarded at module scope took the whole client down.
 */
describe('GameSettings in a browser', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.resetModules()
    })

    it('loads without a process global and falls back to the defaults', async () => {
        vi.stubGlobal('process', undefined)
        vi.resetModules()

        const settings = await import('../src/common/GameSettings')

        expect(settings.MINIMUM_PLAYER_PER_GAME).toBe(6)
        expect(settings.IA_PLAYER_PER_GAME).toBe(0)
        expect(settings.RECONNECT_GRACE_MS).toBeGreaterThan(0)
    })

    it('still reads the environment on the server', async () => {
        vi.stubGlobal('process', { env: { MIN_PLAYER: '2', IA_PLAYER_PER_GAME: '3' } })
        vi.resetModules()

        const settings = await import('../src/common/GameSettings')

        expect(settings.MINIMUM_PLAYER_PER_GAME).toBe(2)
        expect(settings.IA_PLAYER_PER_GAME).toBe(3)
    })
})
