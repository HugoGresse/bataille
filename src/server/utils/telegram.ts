import type { LobbyState } from '../GameLobby'

const botToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID
/** Players whose arrival is not worth a ping, typically whoever receives the pings */
const mutedPlayers = (process.env.TELEGRAM_MUTED_PLAYERS ?? 'Hugo')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)

const GUEST_SUFFIX = / \(guest\)$/i
const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
/** ICU names this placeholder code instead of leaving it unknown */
const UNKNOWN_REGION = 'ZZ'

export const isMutedPlayer = (playerName: string, muted: string[] = mutedPlayers): boolean =>
    muted.includes(playerName.trim().replace(GUEST_SUFFIX, '').toLowerCase())

/** ISO 3166-1 alpha-2 to an English name; anything unknown yields nothing rather than a code */
export const countryName = (code: string | undefined): string | undefined => {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) {
        return undefined
    }
    const upper = code.toUpperCase()
    return upper === UNKNOWN_REGION ? undefined : regionNames.of(upper)
}

export const waitingMessage = (playerName: string, countryCode: string | undefined, state: LobbyState): string => {
    const country = countryName(countryCode)
    const who = country ? `${playerName} (${country})` : playerName
    return `🎮 ${who} is waiting in the Bataille lobby (${state.playerCount}/${state.requiredPlayerCount}). ${state.ongoingGame} game(s) running.`
}

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
