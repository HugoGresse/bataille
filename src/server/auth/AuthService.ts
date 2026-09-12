import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
    AuthenticationResponseJSON,
    AuthFinishResult,
    AuthSession,
    LoginStartResult,
    RegisterStartResult,
    RegistrationResponseJSON,
} from '../../common/auth'
import { accountNameError, normalizeAccountName } from '../../common/auth'
import { Account, AccountStore } from './AccountStore'

export type WebAuthnConfig = {
    rpId: string
    origin: string | string[]
    rpName: string
}

/** The pieces of @simplewebauthn/server the service leans on, swappable in tests */
export type Ceremonies = {
    generateRegistrationOptions: typeof generateRegistrationOptions
    verifyRegistrationResponse: typeof verifyRegistrationResponse
    generateAuthenticationOptions: typeof generateAuthenticationOptions
    verifyAuthenticationResponse: typeof verifyAuthenticationResponse
}

const defaultCeremonies: Ceremonies = {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
}

type PendingChallenge = {
    /** Registration only: the name the account is created under once the passkey is proven */
    name?: string
    expiresAt: number
}

const CHALLENGE_TTL_MS = 5 * 60_000

const failure = (error: string) => ({ ok: false as const, error })

/**
 * The challenge the browser signed, read back from the response: the client tells us which
 * ceremony it is finishing, so a socket that dropped and came back mid-prompt still finds it.
 */
export const challengeOf = (response: unknown): string | null => {
    try {
        const clientDataJSON = (response as { response?: { clientDataJSON?: unknown } })?.response?.clientDataJSON
        if (typeof clientDataJSON !== 'string') {
            return null
        }
        const { challenge } = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8'))
        return typeof challenge === 'string' ? challenge : null
    } catch {
        return null
    }
}

/**
 * The two WebAuthn ceremonies, each in two steps: options out, response back. A challenge is
 * good for one attempt within a few minutes, whatever socket brings it back.
 */
export class AuthService {
    private readonly pending = new Map<string, PendingChallenge>()

    constructor(
        private readonly store: AccountStore,
        private readonly config: WebAuthnConfig,
        private readonly ceremonies: Ceremonies = defaultCeremonies,
        private readonly now: () => number = Date.now
    ) {}

    async startRegistration(rawName: string): Promise<RegisterStartResult> {
        const nameError = accountNameError(rawName)
        if (nameError) {
            return failure(nameError)
        }
        const name = normalizeAccountName(rawName)
        if (this.store.findByName(name)) {
            return failure('That name is already taken')
        }
        const options = await this.ceremonies.generateRegistrationOptions({
            rpName: this.config.rpName,
            rpID: this.config.rpId,
            userName: name,
            attestationType: 'none',
            // Sign-in is usernameless, so a credential the authenticator cannot find on its own
            // would leave the account unreachable
            authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
        })
        this.remember(options.challenge, name)
        return { ok: true, options }
    }

    async finishRegistration(response: RegistrationResponseJSON): Promise<AuthFinishResult> {
        const challenge = challengeOf(response)
        const pending = this.take(challenge)
        if (!challenge || !pending?.name) {
            return failure('No registration in progress, start again')
        }
        try {
            const verification = await this.ceremonies.verifyRegistrationResponse({
                response,
                expectedChallenge: challenge,
                expectedOrigin: this.config.origin,
                expectedRPID: this.config.rpId,
                requireUserVerification: false,
            })
            if (!verification.verified) {
                return failure('Passkey could not be verified')
            }
            // Re-checked after the await: another registration for the same name may have landed
            if (this.store.findByName(pending.name)) {
                return failure('That name is already taken')
            }
            const { credential } = verification.registrationInfo
            const { account, token } = this.store.create(pending.name, {
                id: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString('base64url'),
                counter: credential.counter,
                transports: credential.transports,
            })
            return { ok: true, session: toSession(account, token) }
        } catch (error) {
            console.warn('Passkey registration failed:', error)
            return failure('Passkey could not be verified')
        }
    }

    async startLogin(): Promise<LoginStartResult> {
        const options = await this.ceremonies.generateAuthenticationOptions({
            rpID: this.config.rpId,
            userVerification: 'preferred',
        })
        this.remember(options.challenge)
        return { ok: true, options }
    }

    async finishLogin(response: AuthenticationResponseJSON): Promise<AuthFinishResult> {
        const challenge = challengeOf(response)
        const pending = this.take(challenge)
        if (!challenge || !pending) {
            return failure('No sign-in in progress, start again')
        }
        try {
            const found = typeof response?.id === 'string' ? this.store.findByCredentialId(response.id) : undefined
            if (!found) {
                return failure('Unknown passkey, create an account first')
            }
            const verification = await this.ceremonies.verifyAuthenticationResponse({
                response,
                expectedChallenge: challenge,
                expectedOrigin: this.config.origin,
                expectedRPID: this.config.rpId,
                requireUserVerification: false,
                credential: {
                    id: found.credential.id,
                    publicKey: new Uint8Array(Buffer.from(found.credential.publicKey, 'base64url')),
                    counter: found.credential.counter,
                    transports: found.credential.transports as never,
                },
            })
            if (!verification.verified) {
                return failure('Passkey could not be verified')
            }
            const token = this.store.openSession(found.account, {
                credential: found.credential,
                counter: verification.authenticationInfo.newCounter,
            })
            return { ok: true, session: toSession(found.account, token) }
        } catch (error) {
            console.warn('Passkey sign-in failed:', error)
            return failure('Passkey could not be verified')
        }
    }

    /** The account behind a token a client sends along, or null for a guest or a stale token */
    resolveSession(token: unknown): { accountId: string; name: string } | null {
        if (typeof token !== 'string' || !token) {
            return null
        }
        const account = this.store.findBySessionToken(token)
        return account ? { accountId: account.id, name: account.name } : null
    }

    logout(token: string) {
        try {
            this.store.closeSession(token)
        } catch (error) {
            console.warn('Failed to close a session:', error)
        }
    }

    private remember(challenge: string, name?: string) {
        const now = this.now()
        for (const [key, entry] of this.pending) {
            if (entry.expiresAt < now) {
                this.pending.delete(key)
            }
        }
        this.pending.set(challenge, { name, expiresAt: now + CHALLENGE_TTL_MS })
    }

    private take(challenge: string | null): PendingChallenge | undefined {
        if (!challenge) {
            return undefined
        }
        const pending = this.pending.get(challenge)
        this.pending.delete(challenge)
        if (!pending || pending.expiresAt < this.now()) {
            return undefined
        }
        return pending
    }
}

const toSession = (account: Account, token: string): AuthSession => ({
    token,
    accountId: account.id,
    name: account.name,
})
