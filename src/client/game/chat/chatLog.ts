import { Message } from '../../../server/model/types/Message'

/** A message as the client keeps it: what the server sent, plus when it landed */
export type ReceivedMessage = Message & { at: number }

/** Long enough to scroll back through a whole game's conversation, short enough to stay cheap */
export const MAX_MESSAGE_LOG = 100

export const appendMessage = (log: ReceivedMessage[], message: Message, at: number): ReceivedMessage[] => {
    const next = [...log, { ...message, at }]
    return next.length > MAX_MESSAGE_LOG ? next.slice(next.length - MAX_MESSAGE_LOG) : next
}

/** Only what players typed: game events have the corner feed and the centre notices */
export const chatOnly = (log: ReceivedMessage[]): ReceivedMessage[] => log.filter((message) => message.isUserMessage)

/** Wall clock hh:mm, so a line read later still says when it was said */
export const clockTime = (at: number): string => {
    const date = new Date(at)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
