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
