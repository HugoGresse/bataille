import path from 'node:path'
import { AccountStore } from './AccountStore'
import { AuthService } from './AuthService'
import { WEBAUTHN_ORIGINS, WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME } from './authEnv'

const dataDir = path.resolve(process.env.STATS_DIR ?? 'data')

export const accountStore = new AccountStore(path.join(dataDir, 'accounts.json'))
export const authService = new AuthService(accountStore, {
    rpId: WEBAUTHN_RP_ID,
    origin: WEBAUTHN_ORIGINS,
    rpName: WEBAUTHN_RP_NAME,
})
