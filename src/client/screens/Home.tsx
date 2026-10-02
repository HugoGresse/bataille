import React, { useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import { DonatingBanner } from './DonatingBanner'
import { Link as RouterLink } from 'react-router-dom'
import { HelpDialogButton } from './HelpDialog'
import { getOrCreatePlayerName, isUsablePlayerName, pickUsablePlayerName, savePlayerName } from '../utils/playerName'
import { AccountPanel } from './AccountPanel'
import { useAccountSession } from '../auth/useAccountSession'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { ACCOUNT_NAME_MAX, ACCOUNT_NAME_MIN, normalizeAccountName } from '../../common/auth'

export const Home = () => {
    const [playerName, setPlayerName] = useState(getOrCreatePlayerName)
    const session = useAccountSession()
    // A guest only enters the lobby under the name shown here: an unusable one is not saved
    const nameIsUsable = session !== null || isUsablePlayerName(normalizeAccountName(playerName))

    return (
        <Box
            sx={{
                display: 'flex',
                flex: 1,
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexDirection: 'column',
            }}>
            <Box></Box>

            <Box>
                <Typography variant="h1">Bataille</Typography>
                <Box>
                    <Button
                        variant="contained"
                        size="large"
                        component={RouterLink}
                        to="/lobby"
                        disabled={!nameIsUsable}>
                        PLAY
                    </Button>
                    <HelpDialogButton
                        style={{
                            marginLeft: 68,
                        }}
                    />
                    <Button
                        component={RouterLink}
                        to="/leaderboard"
                        startIcon={<EmojiEventsIcon />}
                        sx={{ marginLeft: 2 }}>
                        Leaderboard
                    </Button>
                </Box>

                <Box sx={{ marginTop: 3 }}>
                    <TextField
                        value={session?.name ?? playerName}
                        disabled={session !== null}
                        error={!nameIsUsable}
                        slotProps={{ htmlInput: { minLength: ACCOUNT_NAME_MIN, maxLength: ACCOUNT_NAME_MAX } }}
                        fullWidth
                        size="small"
                        label={
                            session
                                ? 'Player name (account)'
                                : `Player name (${ACCOUNT_NAME_MIN}<->${ACCOUNT_NAME_MAX} chars)`
                        }
                        onChange={(e) => {
                            let name = e.target.value
                            if (name.length > 0 && name.trim().length === 0) {
                                name = pickUsablePlayerName()
                            }

                            setPlayerName(name)
                            savePlayerName(name)
                        }}
                    />
                    <AccountPanel playerName={playerName} />
                </Box>
            </Box>

            <DonatingBanner />
        </Box>
    )
}
