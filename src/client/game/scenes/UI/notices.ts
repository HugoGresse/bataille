import { Message } from '../../../../server/model/types/Message'

export type NoticeLane = 'centre' | 'feed' | 'none'

const COUNTRY_CAPTURE = / was captured by /
const PLAYER_DEAD = /^Player is dead: /
const PLAYER_DISCONNECTED = /Player disconnected/

/**
 * One rule decides the lane: it happened to you, or it did not. Everything that did not gets no
 * text on the board at all, only a line in the corner feed.
 */
export const laneFor = (message: Message, currentPlayerName: string | undefined): NoticeLane => {
    if (message.isUserMessage) {
        return 'centre' // chat
    }
    if (PLAYER_DISCONNECTED.test(message.content)) {
        return 'feed'
    }
    if (PLAYER_DEAD.test(message.content)) {
        return 'centre' // an elimination changes the game, whoever it is
    }
    if (COUNTRY_CAPTURE.test(message.content)) {
        return involvesMe(message, currentPlayerName) ? 'centre' : 'feed'
    }
    return 'centre'
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
    return { actor: message.player?.n ?? '', text: message.content }
}

/** Elapsed game time as mm:ss, for feed timestamps */
export const stamp = (elapsedMs: number): string => {
    const total = Math.max(0, Math.floor(elapsedMs / 1000))
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
