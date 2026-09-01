import React from 'react'
import { Box, Chip, Link, List, ListItem, Typography } from '@mui/material'
import { changelogEntries, prUrl } from '../changelog/changelog'

type ChangelogListProps = {
    /** The side panel shows fewer entries than the full page */
    limit?: number
    /** Stack the version over its date instead of side by side, leaving the title the width */
    compact?: boolean
}

/** One line per release, newest first. Shared by the changelog page and the lobby side panel. */
export const ChangelogList = ({ limit, compact = false }: ChangelogListProps) => (
    <List>
        {(limit ? changelogEntries.slice(0, limit) : changelogEntries).map((entry) => (
            <ListItem
                key={entry.version}
                disableGutters
                sx={{
                    alignItems: compact ? 'flex-start' : 'baseline',
                    gap: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: compact ? 'column' : 'row',
                        alignItems: compact ? 'center' : 'baseline',
                        gap: compact ? 0.25 : 1.5,
                        flexShrink: 0,
                    }}>
                    <Chip label={`v${entry.version}`} size="small" variant="outlined" color="secondary" />
                    <Typography variant="caption" sx={{ opacity: 0.6, minWidth: compact ? undefined : 80 }}>
                        {entry.date}
                    </Typography>
                </Box>
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
)
