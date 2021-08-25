import React, { useState } from 'react'
import { Box, Button, Typography } from '@material-ui/core'
import { DonatingBanner } from './DonatingBanner'
import { Link as RouterLink } from 'react-router-dom'
import HelpIcon from '@material-ui/icons/HelpOutline'
import { HelpDialog } from './HelpDialog'

export const Home = () => {
    const [helpOpen, setHelpOpen] = useState<boolean>(false)

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
                <Button
                    variant="outlined"
                    onClick={() => {
                        setHelpOpen(true)
                    }}
                    startIcon={<HelpIcon />}
                    style={{
                        marginLeft: 68,
                    }}>
                    How to play
                </Button>
            </Box>

            <DonatingBanner />
            <HelpDialog
                open={helpOpen}
                setOpen={(shouldBeOpen) => {
                    setHelpOpen(shouldBeOpen)
                }}
            />
        </Box>
    )
}
