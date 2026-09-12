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
            const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as StoreFile
            this.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : []
        } catch (error) {
            this.loadError = String(error)
            console.error(`Failed to load accounts from ${this.filePath}:`, error)
        }
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

    create(name: string, credential: StoredCredential, now: Date = new Date()): Account {
        const account: Account = {
            id: crypto.randomUUID(),
            name: normalizeAccountName(name),
            createdAt: now.toISOString(),
            credentials: [credential],
            sessionHashes: [],
        }
        this.accounts.push(account)
        this.persist()
        return account
    }

    updateCounter(credentialId: string, counter: number) {
        const found = this.findByCredentialId(credentialId)
        if (found) {
            found.credential.counter = counter
            this.persist()
        }
    }

    /** @return the token to hand to the client; only its hash is stored */
    openSession(account: Account): string {
        const token = crypto.randomBytes(32).toString('base64url')
        account.sessionHashes = [...account.sessionHashes, hashSessionToken(token)].slice(-SESSIONS_PER_ACCOUNT)
        this.persist()
        return token
    }

    closeSession(token: string) {
        const hash = hashSessionToken(token)
        const account = this.accounts.find((a) => a.sessionHashes.includes(hash))
        if (account) {
            account.sessionHashes = account.sessionHashes.filter((h) => h !== hash)
            this.persist()
        }
    }
}
