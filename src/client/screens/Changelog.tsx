import React, { useEffect } from 'react'
import { Box, Button, Chip, Link, List, ListItem, Typography } from '@mui/material'
import BackIcon from '@mui/icons-material/ArrowBack'
import { changelogEntries, markLatestSeen, prUrl } from '../changelog/changelog'
import { notifySeenChanged } from './VersionBadge'

/**
 * One line per release, newest first: every merge on main ships as a patch version and lands here.
 */
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
            <List>
                {changelogEntries.map((entry) => (
                    <ListItem
                        key={entry.version}
                        disableGutters
                        sx={{ alignItems: 'baseline', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <Chip label={`v${entry.version}`} size="small" variant="outlined" color="secondary" />
                        <Typography variant="caption" sx={{ opacity: 0.6, minWidth: 80 }}>
                            {entry.date}
                        </Typography>
                        <Typography variant="body1" sx={{ flex: 1 }}>
                            {entry.title}
                            {entry.pr !== null && (
                                <>
                                    {' '}
                                    <Link href={prUrl(entry.pr)} target="_blank" color="secondary" variant="body2">
                                        #{entry.pr}
                                    </Link>
                                </>
                            )}
                        </Typography>
                    </ListItem>
                ))}
            </List>
        </Box>
    )
}
