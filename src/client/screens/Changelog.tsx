import React, { useEffect } from 'react'
import { Box, Button, Typography } from '@mui/material'
import BackIcon from '@mui/icons-material/ArrowBack'
import { markLatestSeen } from '../changelog/changelog'
import { ChangelogList } from './ChangelogList'
import { notifySeenChanged } from './VersionBadge'

export const Changelog = () => {
    useEffect(() => {
        markLatestSeen()
        notifySeenChanged()
    }, [])

    return (
        <Box sx={{ maxWidth: 720, margin: '0 auto', padding: 3 }}>
            <Button color="secondary" href="/" startIcon={<BackIcon />}>
                Home
            </Button>
            <Typography variant="h4" sx={{ marginTop: 2 }}>
                What's new
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, marginTop: 1 }}>
                Every change shipped to the game, one version per merge.
            </Typography>
            <ChangelogList />
        </Box>
    )
}
