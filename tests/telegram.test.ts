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

    it('mutes nobody unless TELEGRAM_MUTED_ACCOUNTS says so', async () => {
        vi.stubEnv('TELEGRAM_MUTED_ACCOUNTS', '')
        vi.resetModules()
        const { isMutedAccount } = await import('../src/server/utils/telegram')
        expect(isMutedAccount('Hugo')).toBe(false)
    })

    it('reads the muted accounts from TELEGRAM_MUTED_ACCOUNTS, whatever the case', async () => {
        vi.stubEnv('TELEGRAM_MUTED_ACCOUNTS', 'Hugo, bob')
        vi.resetModules()
        const { isMutedAccount } = await import('../src/server/utils/telegram')
        expect(isMutedAccount('Hugo')).toBe(true)
        expect(isMutedAccount(' hugo ')).toBe(true)
        expect(isMutedAccount('Bob')).toBe(true)
        expect(isMutedAccount('Hugolin')).toBe(false)
        expect(isMutedAccount('Hugo (guest)')).toBe(false)
    })

    it('is enabled only with both the bot token and the chat id', async () => {
        vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot123')
        vi.stubEnv('TELEGRAM_CHAT_ID', '')
        vi.resetModules()
        expect((await import('../src/server/utils/telegram')).telegramEnabled).toBe(false)
        vi.stubEnv('TELEGRAM_CHAT_ID', '999')
        vi.resetModules()
        expect((await import('../src/server/utils/telegram')).telegramEnabled).toBe(true)
    })
})
