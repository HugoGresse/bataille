import React, { useEffect, useState } from 'react'
import { Box, Button, IconButton, Link, Typography, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Link as RouterLink } from 'react-router-dom'
import { markLatestSeen } from '../changelog/changelog'
import { ChangelogList } from './ChangelogList'
import { notifySeenChanged } from './VersionBadge'

const PANEL_WIDTH = 380
const PANEL_ENTRIES = 6

/**
 * Waiting for a lobby is the one moment with nothing to do, so what shipped recently is shown
 * there by default. Only where there is room for it beside the lobby: on a narrow screen it would
 * push the lobby itself off, so it is not rendered at all.
 */
export const ChangelogPanel = () => {
    const theme = useTheme()
    const roomForPanel = useMediaQuery(theme.breakpoints.up('lg'))
    const [open, setOpen] = useState(true)

    // Reading it here counts as reading it: the version chip stops asking for attention
    useEffect(() => {
        if (roomForPanel && open) {
            markLatestSeen()
            notifySeenChanged()
        }
    }, [roomForPanel, open])

    if (!roomForPanel) {
        return null
    }

    if (!open) {
        return (
            <Box sx={{ width: PANEL_WIDTH, flexShrink: 0, padding: 2, textAlign: 'right' }}>
                <Button size="small" color="secondary" onClick={() => setOpen(true)}>
                    What's new
                </Button>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                width: PANEL_WIDTH,
                flexShrink: 0,
                maxHeight: '100vh',
                overflowY: 'auto',
                padding: 2,
                borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">What's new</Typography>
                <IconButton size="small" aria-label="Close the changelog" onClick={() => setOpen(false)}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>
            <ChangelogList limit={PANEL_ENTRIES} compact />
            <Link component={RouterLink} to="/changelog" color="secondary" variant="body2">
                See all versions
            </Link>
        </Box>
    )
}
