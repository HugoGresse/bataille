import { Socket } from 'socket.io'

/**
 * The address a socket connected from. Behind a proxy the socket sees the proxy, so the first hop
 * of `x-forwarded-for` wins when present — that header is client-controlled on a direct connection,
 * which is why only the left-most entry is read and never trusted for anything but statistics.
 */
export const getClientIp = (socket: Socket | undefined): string => {
    if (!socket) {
        return 'unknown' // the player dropped between joining the lobby and the game starting
    }
    const forwarded = socket.handshake.headers['x-forwarded-for']
    const firstHop = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
    return normaliseIp(firstHop?.trim() || socket.handshake.address || '')
}

/** IPv4 addresses arrive over an IPv6 socket as `::ffff:1.2.3.4`, which would split one host in two */
export const normaliseIp = (address: string): string => {
    const trimmed = address.trim()
    if (!trimmed) {
        return 'unknown'
    }
    const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    return mapped ? mapped[1] : trimmed
}
