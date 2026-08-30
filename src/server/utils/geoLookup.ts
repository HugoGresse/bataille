/**
 * Resolves the country an address sits in, through a free keyless lookup service.
 *
 * Three things keep this from becoming a liability: results are cached per address so a returning
 * player is one request ever, private ranges never leave the machine, and every failure resolves to
 * "no country" rather than throwing — statistics must never be able to break a game starting.
 *
 * Note this does send the player's address to a third party. Set GEO_LOOKUP_URL to an empty string
 * to turn the whole thing off.
 */
const DEFAULT_ENDPOINT = 'https://ipwho.is/'
const TIMEOUT_MS = 2500
/** Bounded so a long-lived server cannot grow this without limit */
const MAX_CACHED = 5000

const cache = new Map<string, string | undefined>()

export const lookupCountry = async (ip: string): Promise<string | undefined> => {
    const endpoint = process.env.GEO_LOOKUP_URL ?? DEFAULT_ENDPOINT
    if (!endpoint || !ip || isPrivateAddress(ip)) {
        return undefined
    }
    if (cache.has(ip)) {
        return cache.get(ip)
    }

    let country: string | undefined
    try {
        const response = await fetch(`${endpoint}${encodeURIComponent(ip)}`, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { accept: 'application/json' },
        })
        if (response.ok) {
            country = readCountryCode(await response.json())
        }
    } catch {
        // offline, rate limited, timed out: the stat simply has no country
    }

    if (cache.size >= MAX_CACHED) {
        cache.clear()
    }
    cache.set(ip, country)
    return country
}

/** Field naming differs between the free providers, so accept the common spellings */
export const readCountryCode = (payload: unknown): string | undefined => {
    if (!payload || typeof payload !== 'object') {
        return undefined
    }
    const body = payload as Record<string, unknown>
    if (body.success === false) {
        return undefined
    }
    const code = body.country_code ?? body.countryCode ?? body.country
    if (typeof code !== 'string') {
        return undefined
    }
    const trimmed = code.trim().toUpperCase()
    return /^[A-Z]{2}$/.test(trimmed) ? trimmed : undefined
}

/** Loopback, link-local and the RFC1918 ranges: no point asking the internet about those */
export const isPrivateAddress = (ip: string): boolean => {
    const address = ip.trim().toLowerCase()
    if (!address || address === 'unknown' || address === '::1' || address === '::') {
        return true
    }
    // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
    if (/^f[cd]/.test(address) || address.startsWith('fe80:')) {
        return true
    }
    const parts = address.split('.').map(Number)
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false
    }
    const [first, second] = parts
    return (
        first === 10 ||
        first === 127 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254)
    )
}

/** Test seam: the cache is process-wide and would otherwise leak between cases */
export const clearCountryCache = () => cache.clear()
