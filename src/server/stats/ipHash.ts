import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Addresses are never stored, only a keyed hash of them, so the stats file cannot be turned back
 * into a list of who played from where.
 *
 * The key matters: IPv4 is only four billion values, so a plain digest of an address is trivially
 * reversed by hashing the whole space. It has to stay the same across restarts or the same host
 * would count as a new one every deploy, so it is read from STATS_IP_SALT when set and otherwise
 * generated once and kept beside the stats file.
 */
const HASH_LENGTH = 16

export type IpHasher = (ip: string) => string

export const createIpHasher = (saltFilePath: string): IpHasher => {
    let salt: string | null = null

    const getSalt = (): string => {
        if (salt === null) {
            salt = resolveSalt(saltFilePath)
        }
        return salt
    }

    return (ip: string) => crypto.createHmac('sha256', getSalt()).update(ip).digest('hex').slice(0, HASH_LENGTH)
}

const resolveSalt = (saltFilePath: string): string => {
    const fromEnv = process.env.STATS_IP_SALT?.trim()
    if (fromEnv) {
        return fromEnv
    }
    try {
        if (fs.existsSync(saltFilePath)) {
            const stored = fs.readFileSync(saltFilePath, 'utf8').trim()
            if (stored) {
                return stored
            }
        }
        const generated = crypto.randomBytes(32).toString('hex')
        fs.mkdirSync(path.dirname(saltFilePath), { recursive: true })
        // Readable only by the account running the server: it is the secret the hashes rest on
        fs.writeFileSync(saltFilePath, `${generated}\n`, { mode: 0o600 })
        return generated
    } catch (error) {
        console.error('Failed to persist the stats IP salt, falling back to a per-process one:', error)
        // Counts still work while the process lives; they restart on the next boot
        return crypto.randomBytes(32).toString('hex')
    }
}
