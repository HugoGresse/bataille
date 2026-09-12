import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
} from '@simplewebauthn/browser'

export const ACCOUNT_NAME_MIN = 2
export const ACCOUNT_NAME_MAX = 20

/** What a signed-in client holds: the token proves the account on every socket */
export type AuthSession = {
    token: string
    accountId: string
    name: string
}

export type AuthFailure = { ok: false; error: string }

export type RegisterStartResult = { ok: true; options: PublicKeyCredentialCreationOptionsJSON } | AuthFailure
export type LoginStartResult = { ok: true; options: PublicKeyCredentialRequestOptionsJSON } | AuthFailure
export type AuthFinishResult = { ok: true; session: AuthSession } | AuthFailure

export type { AuthenticationResponseJSON, RegistrationResponseJSON }

export type LeaderboardEntry = {
    accountId: string
    name: string
    games: number
    wins: number
    /** 0..1 */
    winRate: number
    /** Wins in games with at least one other human */
    winsVsHumans: number
}

export const normalizeAccountName = (raw: string): string => raw.trim().replace(/\s+/g, ' ')

export const accountNameError = (raw: string): string | null => {
    const name = normalizeAccountName(raw)
    if (name.length < ACCOUNT_NAME_MIN || name.length > ACCOUNT_NAME_MAX) {
        return `Name must be ${ACCOUNT_NAME_MIN} to ${ACCOUNT_NAME_MAX} characters`
    }
    if (/^ai-\d+$/i.test(name)) {
        return 'That name is reserved for AI players'
    }
    return null
}
