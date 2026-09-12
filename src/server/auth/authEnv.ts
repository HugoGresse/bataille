export const WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID?.trim() || 'localhost'
/** Comma-separated: a dev setup often serves the page from more than one port */
export const WEBAUTHN_ORIGINS = (process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
export const WEBAUTHN_RP_NAME = 'Bataille'
