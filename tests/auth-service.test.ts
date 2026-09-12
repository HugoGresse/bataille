import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AccountStore } from '../src/server/auth/AccountStore'
import { AuthService, Ceremonies } from '../src/server/auth/AuthService'

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

let filePath: string
let store: AccountStore

beforeEach(() => {
    filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bataille-accounts-')), 'accounts.json')
    store = new AccountStore(filePath)
})

const register = async (auth: AuthService, name: string, clientId = 'sock', credentialId = `cred-${name}`) => {
    const start = await auth.startRegistration(clientId, name)
    expect(start.ok).toBe(true)
    return auth.finishRegistration(clientId, { id: credentialId } as never)
}

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
        expect(reloaded.findByName('alice')?.credentials[0]).toMatchObject({ id: 'cred-  Alice  ', counter: 0 })
        expect(fs.readFileSync(filePath, 'utf8')).not.toContain(session!.token)
    })

    it('refuses invalid or taken names before any ceremony', async () => {
        const ceremonies = makeCeremonies()
        const auth = new AuthService(store, config, ceremonies)
        expect(await auth.startRegistration('s', 'x')).toMatchObject({ ok: false })
        expect(await auth.startRegistration('s', 'AI-3')).toMatchObject({ ok: false })
        await register(auth, 'Alice')
        expect(await auth.startRegistration('s', 'ALICE')).toEqual({ ok: false, error: 'That name is already taken' })
        expect(ceremonies.generateRegistrationOptions).toHaveBeenCalledTimes(1)
    })

    it('refuses a finish without a start, a stale challenge, or a failed verification', async () => {
        let now = 0
        const ceremonies = makeCeremonies({
            verifyRegistrationResponse: vi.fn(async () => ({ verified: false }) as never),
        })
        const auth = new AuthService(store, config, ceremonies, () => now)
        expect(await auth.finishRegistration('s', { id: 'c' } as never)).toMatchObject({ ok: false })

        await auth.startRegistration('s', 'Alice')
        now = 6 * 60_000
        expect(await auth.finishRegistration('s', { id: 'c' } as never)).toMatchObject({ ok: false })

        await auth.startRegistration('s', 'Alice')
        expect(await auth.finishRegistration('s', { id: 'c' } as never)).toMatchObject({ ok: false })
        expect(store.count()).toBe(0)
    })
})

describe('AuthService login', () => {
    it('finds the account by credential, verifies, and bumps the counter', async () => {
        const ceremonies = makeCeremonies()
        const auth = new AuthService(store, config, ceremonies)
        await register(auth, 'Alice')

        expect(await auth.startLogin('other')).toMatchObject({ ok: true })
        const result = await auth.finishLogin('other', { id: 'cred-Alice' } as never)
        expect(result).toMatchObject({ ok: true, session: { name: 'Alice' } })
        expect(ceremonies.verifyAuthenticationResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                expectedChallenge: 'login',
                credential: expect.objectContaining({ id: 'cred-Alice', counter: 0 }),
            })
        )
        expect(store.findByCredentialId('cred-Alice')?.credential.counter).toBe(7)
    })

    it('rejects an unknown passkey and a challenge used twice', async () => {
        const auth = new AuthService(store, config, makeCeremonies())
        await auth.startLogin('s')
        expect(await auth.finishLogin('s', { id: 'nope' } as never)).toEqual({
            ok: false,
            error: 'Unknown passkey, create an account first',
        })
        expect(await auth.finishLogin('s', { id: 'nope' } as never)).toMatchObject({ ok: false })
    })

    it('logout drops the session token', async () => {
        const auth = new AuthService(store, config, makeCeremonies())
        const result = await register(auth, 'Alice')
        const token = result.ok ? result.session.token : ''
        auth.logout(token)
        expect(auth.resolveSession(token)).toBeNull()
        expect(auth.resolveSession(null)).toBeNull()
    })
})
