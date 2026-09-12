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
import { AccountStore } from './AccountStore'

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
    challenge: string
    /** Registration only: the name the account is created under once the passkey is proven */
    name?: string
    expiresAt: number
}

const CHALLENGE_TTL_MS = 5 * 60_000

const failure = (error: string) => ({ ok: false as const, error })

/**
 * The two WebAuthn ceremonies, each in two steps keyed by the socket that asked: options out,
 * response back. A challenge lives for one attempt and a few minutes.
 */
export class AuthService {
    private readonly pending = new Map<string, PendingChallenge>()

    constructor(
        private readonly store: AccountStore,
        private readonly config: WebAuthnConfig,
        private readonly ceremonies: Ceremonies = defaultCeremonies,
        private readonly now: () => number = Date.now
    ) {}

    async startRegistration(clientId: string, rawName: string): Promise<RegisterStartResult> {
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
            authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
        })
        this.remember(clientId, options.challenge, name)
        return { ok: true, options }
    }

    async finishRegistration(clientId: string, response: RegistrationResponseJSON): Promise<AuthFinishResult> {
        const pending = this.take(clientId)
        if (!pending?.name) {
            return failure('No registration in progress, start again')
        }
        if (this.store.findByName(pending.name)) {
            return failure('That name is already taken')
        }
        try {
            const verification = await this.ceremonies.verifyRegistrationResponse({
                response,
                expectedChallenge: pending.challenge,
                expectedOrigin: this.config.origin,
                expectedRPID: this.config.rpId,
                requireUserVerification: false,
            })
            if (!verification.verified) {
                return failure('Passkey could not be verified')
            }
            const { credential } = verification.registrationInfo
            const account = this.store.create(pending.name, {
                id: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString('base64url'),
                counter: credential.counter,
                transports: credential.transports,
            })
            return { ok: true, session: this.openSession(account.id, account.name) }
        } catch (error) {
            console.warn('Passkey registration failed:', error)
            return failure('Passkey could not be verified')
        }
    }

    async startLogin(clientId: string): Promise<LoginStartResult> {
        const options = await this.ceremonies.generateAuthenticationOptions({
            rpID: this.config.rpId,
            userVerification: 'preferred',
        })
        this.remember(clientId, options.challenge)
        return { ok: true, options }
    }

    async finishLogin(clientId: string, response: AuthenticationResponseJSON): Promise<AuthFinishResult> {
        const pending = this.take(clientId)
        if (!pending) {
            return failure('No sign-in in progress, start again')
        }
        const found = this.store.findByCredentialId(response.id)
        if (!found) {
            return failure('Unknown passkey, create an account first')
        }
        try {
            const verification = await this.ceremonies.verifyAuthenticationResponse({
                response,
                expectedChallenge: pending.challenge,
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
            this.store.updateCounter(found.credential.id, verification.authenticationInfo.newCounter)
            return { ok: true, session: this.openSession(found.account.id, found.account.name) }
        } catch (error) {
            console.warn('Passkey sign-in failed:', error)
            return failure('Passkey could not be verified')
        }
    }

    /** The account behind a token a client sends along, or null for a guest or a stale token */
    resolveSession(token: string | null | undefined): { accountId: string; name: string } | null {
        if (!token) {
            return null
        }
        const account = this.store.findBySessionToken(token)
        return account ? { accountId: account.id, name: account.name } : null
    }

    logout(token: string) {
        this.store.closeSession(token)
    }

    /** A socket gone mid-ceremony leaves nothing behind */
    forget(clientId: string) {
        this.pending.delete(clientId)
    }

    private openSession(accountId: string, name: string): AuthSession {
        const account = this.store.findById(accountId)!
        return { token: this.store.openSession(account), accountId, name }
    }

    private remember(clientId: string, challenge: string, name?: string) {
        this.pending.set(clientId, { challenge, name, expiresAt: this.now() + CHALLENGE_TTL_MS })
    }

    private take(clientId: string): PendingChallenge | undefined {
        const pending = this.pending.get(clientId)
        this.pending.delete(clientId)
        if (!pending || pending.expiresAt < this.now()) {
            return undefined
        }
        return pending
    }
}
