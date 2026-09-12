import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeAccountName } from '../../common/auth'

export type StoredCredential = {
    id: string
    /** base64url */
    publicKey: string
    counter: number
    transports?: string[]
}

export type Account = {
    id: string
    name: string
    createdAt: string
    credentials: StoredCredential[]
    /** sha256 of the tokens handed to clients; the token itself is never written down */
    sessionHashes: string[]
}

type StoreFile = {
    version: 1
    accounts: Account[]
}

const SESSIONS_PER_ACCOUNT = 10

export const hashSessionToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

/**
 * Every account in one JSON file, rewritten whole on each change: a handful of players, so a
 * database would be more setup than the game. Writes go through a temp file and a rename, so a
 * crash mid-write leaves the previous file intact.
 */
export class AccountStore {
    private accounts: Account[] = []
    private loadError: string | null = null

    constructor(private readonly filePath: string) {
        this.load()
    }

    private load() {
        try {
            if (!fs.existsSync(this.filePath)) {
                return
            }
            const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Partial<StoreFile>
            if (parsed.version !== 1 || !Array.isArray(parsed.accounts)) {
                throw new Error('unexpected accounts file shape')
            }
            this.accounts = parsed.accounts.flatMap((raw) => {
                const account = normalizeRecord(raw)
                if (!account) {
                    console.error('Dropping malformed account record:', raw)
                }
                return account ? [account] : []
            })
        } catch (error) {
            this.loadError = String(error)
            console.error(`Failed to load accounts from ${this.filePath}:`, error)
        }
    }

    /**
     * Mutate in memory, then write. A write that fails restores the previous state so a retry
     * does not see an account the disk never got. A file that failed to load is never written
     * over: whatever it held would be lost.
     */
    private commit<T>(mutation: () => T): T {
        if (this.loadError) {
            throw new Error(`accounts file failed to load, refusing to overwrite it: ${this.loadError}`)
        }
        const snapshot = structuredClone(this.accounts)
        const result = mutation()
        try {
            this.persist()
        } catch (error) {
            this.accounts = snapshot
            throw error
        }
        return result
    }

    private persist() {
        const file: StoreFile = { version: 1, accounts: this.accounts }
        const tmpPath = `${this.filePath}.tmp`
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
        fs.writeFileSync(tmpPath, JSON.stringify(file, null, 2), { mode: 0o600 })
        fs.renameSync(tmpPath, this.filePath)
    }

    getLoadError(): string | null {
        return this.loadError
    }

    count(): number {
        return this.accounts.length
    }

    findById(id: string): Account | undefined {
        return this.accounts.find((account) => account.id === id)
    }

    findByName(name: string): Account | undefined {
        const wanted = normalizeAccountName(name).toLowerCase()
        return this.accounts.find((account) => account.name.toLowerCase() === wanted)
    }

    findByCredentialId(credentialId: string): { account: Account; credential: StoredCredential } | undefined {
        for (const account of this.accounts) {
            const credential = account.credentials.find((c) => c.id === credentialId)
            if (credential) {
                return { account, credential }
            }
        }
        return undefined
    }

    findBySessionToken(token: string): Account | undefined {
        const hash = hashSessionToken(token)
        return this.accounts.find((account) => account.sessionHashes.includes(hash))
    }

    /** Creates the account and its first session in one write. Throws if the name is taken. */
    create(name: string, credential: StoredCredential, now: Date = new Date()): { account: Account; token: string } {
        return this.commit(() => {
            if (this.findByName(name)) {
                throw new Error('name already taken')
            }
            const account: Account = {
                id: crypto.randomUUID(),
                name: normalizeAccountName(name),
                createdAt: now.toISOString(),
                credentials: [credential],
                sessionHashes: [],
            }
            this.accounts.push(account)
            return { account, token: addSession(account) }
        })
    }

    /**
     * Opens a session, recording the new signature counter of the passkey that proved it in the
     * same write. @return the token to hand to the client; only its hash is stored
     */
    openSession(account: Account, used?: { credential: StoredCredential; counter: number }): string {
        return this.commit(() => {
            if (used) {
                used.credential.counter = used.counter
            }
            return addSession(account)
        })
    }

    closeSession(token: string) {
        const hash = hashSessionToken(token)
        const account = this.accounts.find((a) => a.sessionHashes.includes(hash))
        if (account) {
            this.commit(() => {
                account.sessionHashes = account.sessionHashes.filter((h) => h !== hash)
            })
        }
    }
}

const addSession = (account: Account): string => {
    const token = crypto.randomBytes(32).toString('base64url')
    account.sessionHashes = [...account.sessionHashes, hashSessionToken(token)].slice(-SESSIONS_PER_ACCOUNT)
    return token
}

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')

const isCredential = (value: unknown): value is StoredCredential => {
    const c = value as Partial<StoredCredential> | null
    return (
        !!c &&
        typeof c.id === 'string' &&
        typeof c.publicKey === 'string' &&
        typeof c.counter === 'number' &&
        (c.transports === undefined || isStringArray(c.transports))
    )
}

/** A record read from disk is only trusted once every field it will be asked for is there */
const normalizeRecord = (raw: unknown): Account | null => {
    const a = raw as Partial<Account> | null
    if (!a || typeof a.id !== 'string' || typeof a.name !== 'string') {
        return null
    }
    if (!Array.isArray(a.credentials) || !a.credentials.every(isCredential)) {
        return null
    }
    return {
        id: a.id,
        name: a.name,
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date(0).toISOString(),
        credentials: a.credentials,
        sessionHashes: isStringArray(a.sessionHashes) ? a.sessionHashes : [],
    }
}
