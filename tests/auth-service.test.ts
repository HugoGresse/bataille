import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AccountStore } from '../src/server/auth/AccountStore'
import { AuthService, Ceremonies, challengeOf } from '../src/server/auth/AuthService'

const config = { rpId: 'localhost', origin: 'http://localhost:3000', rpName: 'Bataille' }

const makeCeremonies = (overrides: Partial<Ceremonies> = {}): Ceremonies => ({
    generateRegistrationOptions: vi.fn(async ({ userName }) => ({ challenge: `reg-${userName}` }) as never),
    verifyRegistrationResponse: vi.fn(
        async ({ response }) =>
            ({
                verified: true,
                registrationInfo: {
                    credential: {
                        id: response.id,
                        publicKey: new Uint8Array([1, 2, 3]),
                        counter: 0,
                        transports: ['internal'],
                    },
                },
            }) as never
    ),
    generateAuthenticationOptions: vi.fn(async () => ({ challenge: 'login' }) as never),
    verifyAuthenticationResponse: vi.fn(
        async () => ({ verified: true, authenticationInfo: { newCounter: 7 } }) as never
    ),
    ...overrides,
})

/** What the browser hands back: the signed challenge travels inside clientDataJSON */
const signed = (id: string, challenge: string) =>
    ({
        id,
        response: { clientDataJSON: Buffer.from(JSON.stringify({ challenge })).toString('base64url') },
    }) as never

let filePath: string
let store: AccountStore

beforeEach(() => {
    filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bataille-accounts-')), 'accounts.json')
    store = new AccountStore(filePath)
})

const register = async (auth: AuthService, name: string, credentialId = `cred-${name.trim()}`) => {
    const start = await auth.startRegistration(name)
    expect(start.ok).toBe(true)
    return auth.finishRegistration(signed(credentialId, `reg-${name.trim()}`))
}

describe('challengeOf', () => {
    it('reads the challenge out of clientDataJSON and tolerates garbage', () => {
        expect(challengeOf(signed('c', 'abc'))).toBe('abc')
        expect(challengeOf(null)).toBeNull()
        expect(challengeOf({ response: { clientDataJSON: '!!' } })).toBeNull()
        expect(challengeOf({ response: { clientDataJSON: Buffer.from('{}').toString('base64url') } })).toBeNull()
    })
})

describe('AuthService registration', () => {
    it('creates the account and opens a session once the passkey is verified', async () => {
        const ceremonies = makeCeremonies()
        const auth = new AuthService(store, config, ceremonies)
        const result = await register(auth, '  Alice  ')

        expect(result).toMatchObject({ ok: true, session: { name: 'Alice' } })
        expect(ceremonies.verifyRegistrationResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                expectedChallenge: 'reg-Alice',
                expectedOrigin: config.origin,
                expectedRPID: 'localhost',
            })
        )
        const session = result.ok ? result.session : null
        expect(auth.resolveSession(session!.token)).toEqual({ accountId: session!.accountId, name: 'Alice' })

        const reloaded = new AccountStore(filePath)
        expect(reloaded.findByName('alice')?.credentials[0]).toMatchObject({ id: 'cred-Alice', counter: 0 })
        expect(fs.readFileSync(filePath, 'utf8')).not.toContain(session!.token)
    })

    it('asks for a discoverable credential, since sign-in is usernameless', async () => {
        const ceremonies = makeCeremonies()
        await new AuthService(store, config, ceremonies).startRegistration('Alice')
        expect(ceremonies.generateRegistrationOptions).toHaveBeenCalledWith(
            expect.objectContaining({ authenticatorSelection: expect.objectContaining({ residentKey: 'required' }) })
        )
    })

    it('refuses invalid or taken names before any ceremony', async () => {
        const ceremonies = makeCeremonies()
        const auth = new AuthService(store, config, ceremonies)
        expect(await auth.startRegistration('x')).toMatchObject({ ok: false })
        expect(await auth.startRegistration('AI-3')).toMatchObject({ ok: false })
        await register(auth, 'Alice')
        expect(await auth.startRegistration('ALICE')).toEqual({ ok: false, error: 'That name is already taken' })
        expect(ceremonies.generateRegistrationOptions).toHaveBeenCalledTimes(1)
    })

    it('refuses a finish without a start, a stale challenge, a garbage payload, or a failed verification', async () => {
        let now = 0
        const ceremonies = makeCeremonies({
            verifyRegistrationResponse: vi.fn(async () => ({ verified: false }) as never),
        })
        const auth = new AuthService(store, config, ceremonies, () => now)
        expect(await auth.finishRegistration(signed('c', 'reg-Alice'))).toMatchObject({ ok: false })
        expect(await auth.finishRegistration(null as never)).toMatchObject({ ok: false })

        await auth.startRegistration('Alice')
        now = 6 * 60_000
        expect(await auth.finishRegistration(signed('c', 'reg-Alice'))).toMatchObject({ ok: false })

        await auth.startRegistration('Alice')
        expect(await auth.finishRegistration(signed('c', 'reg-Alice'))).toMatchObject({ ok: false })
        expect(store.count()).toBe(0)
    })

    it('does not create a second account when two registrations race on one name', async () => {
        const auth = new AuthService(store, config, makeCeremonies())
        await auth.startRegistration('Alice')
        const a = auth.finishRegistration(signed('cred-a', 'reg-Alice'))
        await auth.startRegistration('Alice')
        const b = auth.finishRegistration(signed('cred-b', 'reg-Alice'))
        const results = await Promise.all([a, b])
        expect(results.filter((r) => r.ok)).toHaveLength(1)
        expect(store.count()).toBe(1)
    })
})

describe('AuthService login', () => {
    it('finds the account by credential, verifies, and bumps the counter in the same write', async () => {
        const ceremonies = makeCeremonies()
        const auth = new AuthService(store, config, ceremonies)
        await register(auth, 'Alice')

        expect(await auth.startLogin()).toMatchObject({ ok: true })
        const result = await auth.finishLogin(signed('cred-Alice', 'login'))
        expect(result).toMatchObject({ ok: true, session: { name: 'Alice' } })
        expect(ceremonies.verifyAuthenticationResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                expectedChallenge: 'login',
                credential: expect.objectContaining({ id: 'cred-Alice', counter: 0 }),
            })
        )
        expect(new AccountStore(filePath).findByCredentialId('cred-Alice')?.credential.counter).toBe(7)
    })

    it('rejects an unknown passkey, a garbage payload, and a challenge used twice', async () => {
        const auth = new AuthService(store, config, makeCeremonies())
        await auth.startLogin()
        expect(await auth.finishLogin(signed('nope', 'login'))).toEqual({
            ok: false,
            error: 'Unknown passkey, create an account first',
        })
        expect(await auth.finishLogin(signed('nope', 'login'))).toMatchObject({ ok: false })
        await auth.startLogin()
        expect(await auth.finishLogin(null as never)).toMatchObject({ ok: false })
        expect(await auth.finishLogin({ id: 1, response: {} } as never)).toMatchObject({ ok: false })
    })

    it('logout drops the session token and ignores a non-string token', async () => {
        const auth = new AuthService(store, config, makeCeremonies())
        const result = await register(auth, 'Alice')
        const token = result.ok ? result.session.token : ''
        auth.logout(token)
        expect(auth.resolveSession(token)).toBeNull()
        expect(auth.resolveSession(null)).toBeNull()
        expect(auth.resolveSession({} as never)).toBeNull()
        expect(auth.resolveSession(123 as never)).toBeNull()
    })
})

describe('AccountStore durability', () => {
    it('rolls the memory back when the write fails, so a retry is possible', async () => {
        const auth = new AuthService(store, config, makeCeremonies())
        const spy = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
            throw new Error('ENOSPC')
        })
        expect(await register(auth, 'Alice')).toMatchObject({ ok: false })
        expect(store.count()).toBe(0)
        spy.mockRestore()
        expect(await register(auth, 'Alice')).toMatchObject({ ok: true })
    })

    it('never overwrites a file it could not load', () => {
        fs.writeFileSync(filePath, '{not json')
        const broken = new AccountStore(filePath)
        expect(broken.getLoadError()).not.toBeNull()
        expect(() => broken.create('Alice', { id: 'c', publicKey: 'AA', counter: 0 })).toThrow(/refusing/)
        expect(fs.readFileSync(filePath, 'utf8')).toBe('{not json')
    })

    it('drops malformed records and defaults missing session lists on load', () => {
        fs.writeFileSync(
            filePath,
            JSON.stringify({
                version: 1,
                accounts: [
                    { id: 'a', name: 'Alice', credentials: [{ id: 'c', publicKey: 'AA', counter: 0 }] },
                    { id: 'b', name: 'Bob', credentials: 'nope', sessionHashes: [] },
                    { name: 'NoId', credentials: [], sessionHashes: [] },
                ],
            })
        )
        const loaded = new AccountStore(filePath)
        expect(loaded.count()).toBe(1)
        expect(loaded.findBySessionToken('anything')).toBeUndefined()
        expect(loaded.findByCredentialId('c')?.account.name).toBe('Alice')
    })
})
