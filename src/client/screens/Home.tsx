import React from 'react'
import { Box, Button, Typography } from '@material-ui/core'
import { DonatingBanner } from './DonatingBanner'
import { Link as RouterLink } from 'react-router-dom'
import { HelpDialogButton } from './HelpDialog'

export const Home = () => {
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
                <Button variant="contained" size="large" component={RouterLink} to="/lobby">
                    PLAY
                </Button>
                <HelpDialogButton
                    style={{
                        marginLeft: 68,
                    }}
                />
            </Box>

            <DonatingBanner />
        </Box>
    )
}
