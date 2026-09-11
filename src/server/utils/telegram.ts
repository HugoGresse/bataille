const botToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

/**
 * Fire-and-forget a Telegram message, the way trackings post to their collector: a no-op unless
 * both the bot token and the chat id are set, and a failure is logged rather than thrown so it can
 * never break the caller.
 */
export const notifyTelegram = (text: string): void => {
    if (!botToken || !chatId) {
        return
    }
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    }).catch((error) => console.warn('Telegram notification failed', error))
}
