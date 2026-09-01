import { describe, expect, it } from 'vitest'
import { appendMessage, chatOnly, clockTime, MAX_MESSAGE_LOG, ReceivedMessage } from '../src/client/game/chat/chatLog'
import { Message } from '../src/server/model/types/Message'

const chat = (content: string, name = 'Fili'): Message => ({
    content,
    player: { n: name, i: 0, c: '0xFF0000', ctr: [], cnt: true, d: false, s: false, tw: 0 },
    isUserMessage: true,
})

const event = (content: string): Message => ({ content, player: null, isUserMessage: false })

describe('appendMessage', () => {
    it('keeps arrival order and stamps the time', () => {
        const log = appendMessage(appendMessage([], chat('one'), 1000), chat('two'), 2000)
        expect(log.map((message) => message.content)).toEqual(['one', 'two'])
        expect(log.map((message) => message.at)).toEqual([1000, 2000])
    })

    it('does not mutate the log it is given', () => {
        const log: ReceivedMessage[] = []
        appendMessage(log, chat('one'), 1000)
        expect(log).toHaveLength(0)
    })

    it('drops the oldest lines past the cap', () => {
        let log: ReceivedMessage[] = []
        for (let index = 0; index < MAX_MESSAGE_LOG + 10; index++) {
            log = appendMessage(log, chat(`line ${index}`), index)
        }
        expect(log).toHaveLength(MAX_MESSAGE_LOG)
        expect(log[0].content).toBe('line 10')
        expect(log[log.length - 1].content).toBe(`line ${MAX_MESSAGE_LOG + 9}`)
    })
})

describe('chatOnly', () => {
    it('keeps what players typed and drops game events', () => {
        let log: ReceivedMessage[] = []
        log = appendMessage(log, chat('hello'), 1)
        log = appendMessage(log, event('France (+5) was captured by AI-2'), 2)
        log = appendMessage(log, chat('bye', 'Kili'), 3)
        expect(chatOnly(log).map((message) => message.content)).toEqual(['hello', 'bye'])
    })
})

describe('clockTime', () => {
    it('pads to hh:mm', () => {
        const at = new Date(2026, 0, 1, 9, 5).getTime()
        expect(clockTime(at)).toBe('09:05')
    })
})
