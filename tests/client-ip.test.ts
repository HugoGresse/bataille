import { describe, expect, it } from 'vitest'
import { Socket } from 'socket.io'
import { getClientIp, normaliseIp } from '../src/server/utils/clientIp'

const socketWith = (address: string, forwarded?: string | string[]): Socket =>
    ({ handshake: { address, headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded } } }) as Socket

describe('normaliseIp', () => {
    it('unwraps IPv4 addresses arriving over an IPv6 socket', () => {
        expect(normaliseIp('::ffff:82.1.2.3')).toBe('82.1.2.3')
        expect(normaliseIp('::FFFF:82.1.2.3')).toBe('82.1.2.3')
    })

    it('leaves real IPv6 and IPv4 addresses alone', () => {
        expect(normaliseIp('2a01:e0a::1')).toBe('2a01:e0a::1')
        expect(normaliseIp('82.1.2.3')).toBe('82.1.2.3')
    })

    it('names the empty case rather than grouping it under an empty string', () => {
        expect(normaliseIp('')).toBe('unknown')
        expect(normaliseIp('   ')).toBe('unknown')
    })
})

describe('getClientIp', () => {
    it('uses the socket address when there is no proxy', () => {
        expect(getClientIp(socketWith('::ffff:82.1.2.3'))).toBe('82.1.2.3')
    })

    it('takes the first hop of x-forwarded-for behind a proxy', () => {
        expect(getClientIp(socketWith('10.0.0.1', '82.1.2.3, 10.0.0.7, 10.0.0.1'))).toBe('82.1.2.3')
        expect(getClientIp(socketWith('10.0.0.1', ['82.1.2.3', '10.0.0.7']))).toBe('82.1.2.3')
    })

    it('falls back to the socket address when the header is empty', () => {
        expect(getClientIp(socketWith('82.1.2.3', ''))).toBe('82.1.2.3')
        expect(getClientIp(socketWith('82.1.2.3', '   '))).toBe('82.1.2.3')
    })

    it('reports a dropped socket as unknown instead of throwing', () => {
        expect(getClientIp(undefined)).toBe('unknown')
    })
})
