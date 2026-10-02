import { afterEach, describe, expect, it, vi } from 'vitest'

describe('notifyTelegram', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.resetModules()
    })

    it('posts the message to the Telegram API when a bot token and chat id are set', async () => {
        vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot123')
        vi.stubEnv('TELEGRAM_CHAT_ID', '999')
        vi.resetModules()
        const fetchMock = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('fetch', fetchMock)

        const { notifyTelegram } = await import('../src/server/utils/telegram')
        notifyTelegram('someone is waiting')

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, options] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.telegram.org/botbot123/sendMessage')
        expect(JSON.parse(options.body)).toEqual({ chat_id: '999', text: 'someone is waiting' })
    })

    it('does nothing when the token or chat id is missing', async () => {
        vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
        vi.stubEnv('TELEGRAM_CHAT_ID', '')
        vi.resetModules()
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const { notifyTelegram } = await import('../src/server/utils/telegram')
        notifyTelegram('someone is waiting')

        expect(fetchMock).not.toHaveBeenCalled()
    })
})

describe('the waiting ping', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    const state = { playerCount: 1, requiredPlayerCount: 6, ongoingGame: 2 } as never

    it('names the country after the player when it is known', async () => {
        const { waitingMessage, countryName } = await import('../src/server/utils/telegram')
        expect(waitingMessage('Gandalf', 'FR', state)).toBe(
            '🎮 Gandalf (France) is waiting in the Bataille lobby (1/6). 2 game(s) running.'
        )
        expect(waitingMessage('Gandalf', undefined, state)).toBe(
            '🎮 Gandalf is waiting in the Bataille lobby (1/6). 2 game(s) running.'
        )
        expect(countryName('us')).toBe('United States')
        expect(countryName('ZZ')).toBeUndefined()
        expect(countryName('France')).toBeUndefined()
    })

    it('never pings for Hugo by default, whatever the case or the guest suffix', async () => {
        const { isMutedPlayer } = await import('../src/server/utils/telegram')
        expect(isMutedPlayer('Hugo')).toBe(true)
        expect(isMutedPlayer(' hugo ')).toBe(true)
        expect(isMutedPlayer('Hugo (guest)')).toBe(true)
        expect(isMutedPlayer('Hugolin')).toBe(false)
        expect(isMutedPlayer('Gandalf')).toBe(false)
    })

    it('reads the muted names from TELEGRAM_MUTED_PLAYERS', async () => {
        vi.stubEnv('TELEGRAM_MUTED_PLAYERS', 'Alice, bob')
        vi.resetModules()
        const { isMutedPlayer } = await import('../src/server/utils/telegram')
        expect(isMutedPlayer('Bob')).toBe(true)
        expect(isMutedPlayer('alice')).toBe(true)
        expect(isMutedPlayer('Hugo')).toBe(false)
    })
})
