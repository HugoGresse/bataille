import { Message } from '../../../../server/model/types/Message'

export type NoticeLane = 'victory' | 'centre' | 'feed' | 'none'

const COUNTRY_CAPTURE = / was captured by /
const PLAYER_DEAD = /^Player is dead: /
const PLAYER_SURRENDERED = / surrendered$/
const PLAYER_FORFEITED = / gave up: connection lost$/
const PLAYER_BACK = / is back$/
const PLAYER_DISCONNECTED = /Player disconnected/
const VICTORY = /^This game has been won by (.+?)(?:, (.+))?$/
const NO_WINNER = /^No winner(?:, )?(.*)$/

export type VictoryAnnouncement = {
    title: string
    detail: string
    /** The winner is the player reading it, which is the whole difference in how it is dressed */
    mine: boolean
}

/**
 * One rule decides the lane: it happened to you, or it did not. Everything that did not gets no
 * text on the board at all, only a line in the corner feed.
 */
export const laneFor = (message: Message, currentPlayerName: string | undefined): NoticeLane => {
    if (message.isUserMessage) {
        return 'centre' // chat
    }
    if (VICTORY.test(message.content) || NO_WINNER.test(message.content)) {
        return 'victory'
    }
    if (PLAYER_DISCONNECTED.test(message.content) || PLAYER_BACK.test(message.content)) {
        return 'feed'
    }
    if (
        PLAYER_DEAD.test(message.content) ||
        PLAYER_SURRENDERED.test(message.content) ||
        PLAYER_FORFEITED.test(message.content)
    ) {
        return 'centre' // one player fewer changes the game, whoever it is and however they went
    }
    if (COUNTRY_CAPTURE.test(message.content)) {
        return involvesMe(message, currentPlayerName) ? 'centre' : 'feed'
    }
    return 'centre'
}

export const victoryAnnouncement = (
    content: string,
    currentPlayerName: string | undefined
): VictoryAnnouncement | null => {
    const abandoned = NO_WINNER.exec(content)
    if (abandoned) {
        return { title: 'NO WINNER', detail: abandoned[1] ?? '', mine: false }
    }
    const won = VICTORY.exec(content)
    if (!won) {
        return null
    }
    const [, winner, detail] = won
    const mine = !!currentPlayerName && winner === currentPlayerName
    return { title: mine ? 'VICTORY' : winner, detail: detail ?? '', mine }
}

export const involvesMe = (message: Message, currentPlayerName: string | undefined): boolean => {
    if (!currentPlayerName) {
        return false
    }
    return message.player?.n === currentPlayerName || message.content.includes(currentPlayerName)
}

/** "France (+5) was captured by AI-2" reads better in a narrow feed as "AI-2 took France (+5)" */
export const feedLine = (message: Message): { actor: string; text: string } => {
    const capture = message.content.split(COUNTRY_CAPTURE)
    if (capture.length === 2) {
        return { actor: capture[1], text: `took ${capture[0]}` }
    }
    if (PLAYER_DISCONNECTED.test(message.content)) {
        return { actor: message.player?.n ?? '', text: 'left' }
    }
    if (PLAYER_BACK.test(message.content)) {
        return { actor: message.player?.n ?? '', text: 'is back' }
    }
    return { actor: message.player?.n ?? '', text: message.content }
}

/** Elapsed game time as mm:ss, for feed timestamps */
export const stamp = (elapsedMs: number): string => {
    const total = Math.max(0, Math.floor(elapsedMs / 1000))
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
