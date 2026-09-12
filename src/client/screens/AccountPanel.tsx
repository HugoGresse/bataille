import React, { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import KeyIcon from '@mui/icons-material/Key'
import LogoutIcon from '@mui/icons-material/Logout'
import {
    loginWithPasskey,
    logoutPasskey,
    passkeysSupported,
    refreshAccountSession,
    registerWithPasskey,
} from '../auth/passkey'
import { useAccountSession } from '../auth/useAccountSession'
import { accountNameError } from '../../common/auth'

type AccountPanelProps = {
    /** The name typed on the home screen: what a new account is created under */
    playerName: string
}

/**
 * Guests play with any name; a passkey account locks the name and puts the player on the
 * leaderboard. No password, no email: the passkey is the account.
 */
export const AccountPanel = ({ playerName }: AccountPanelProps) => {
    const session = useAccountSession()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supported = passkeysSupported()
    const nameError = accountNameError(playerName)

    useEffect(() => {
        void refreshAccountSession()
    }, [])

    const run = async (action: () => Promise<{ ok: boolean; error?: string }>) => {
        setBusy(true)
        setError(null)
        const result = await action()
        if (!result.ok) {
            setError(result.error ?? 'Something went wrong')
        }
        setBusy(false)
    }

    if (session) {
        return (
            <Box sx={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography>
                    Signed in as <b>{session.name}</b>
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LogoutIcon />}
                    disabled={busy}
                    onClick={() => run(() => logoutPasskey().then(() => ({ ok: true })))}>
                    Sign out
                </Button>
            </Box>
        )
    }

    if (!supported) {
        return (
            <Typography sx={{ marginTop: 2 }} color="text.secondary" variant="body2">
                Passkeys are not supported by this browser: you play as a guest, off the leaderboard.
            </Typography>
        )
    }

    return (
        <Box sx={{ marginTop: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />}
                    disabled={busy}
                    onClick={() => run(loginWithPasskey)}>
                    Sign in with passkey
                </Button>
                <Button
                    size="small"
                    variant="text"
                    disabled={busy || nameError !== null}
                    onClick={() => run(() => registerWithPasskey(playerName))}>
                    Create account as "{playerName}"
                </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
                {nameError ?? 'An account keeps your name and puts you on the leaderboard. Guests can still play.'}
            </Typography>
            {error ? (
                <Alert severity="error" sx={{ marginTop: 1 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            ) : null}
        </Box>
    )
}
