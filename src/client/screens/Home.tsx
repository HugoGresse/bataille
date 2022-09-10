import React, { useState } from 'react'
import { Box, Button, TextField, Typography } from '@material-ui/core'
import { DonatingBanner } from './DonatingBanner'
import { Link as RouterLink } from 'react-router-dom'
import { HelpDialogButton } from './HelpDialog'
import { pickRandomPlayerName } from '../../utils/pickRandomPlayerName'
import { getSavedPlayerName, setPlayerNamePersistent } from '../utils/cookie'

export const Home = () => {
    const [playerName, setPlayerName] = useState(getSavedPlayerName() || pickRandomPlayerName())

    return (
        <Box
            display="flex"
            flex={1}
            minHeight="100vh"
            alignItems="center"
            justifyContent="space-between"
            flexDirection="column">
            <Box></Box>

            <Box>
                <Typography variant="h1">Bataille</Typography>
                <Box>
                    <Button variant="contained" size="large" component={RouterLink} to="/lobby">
                        PLAY
                    </Button>
                    <HelpDialogButton
                        style={{
                            marginLeft: 68,
                        }}
                    />
                </Box>

                <Box marginTop={3}>
                    <TextField
                        value={playerName}
                        inputProps={{ minLength: 2, maxLength: 20 }}
                        fullWidth
                        size="small"
                        label="Player name (2<->20 chars)"
                        onChange={(e) => {
                            let name = e.target.value
                            if (name.length > 0 && name.trim().length === 0) {
                                name = pickRandomPlayerName()
                            }

                            setPlayerName(name)
                            setPlayerNamePersistent(name)
                        }}
                    />
                </Box>
            </Box>

            <DonatingBanner />
        </Box>
    )
}
