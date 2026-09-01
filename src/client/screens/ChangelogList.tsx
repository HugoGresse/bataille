import React from 'react'
import { Chip, Link, List, ListItem, Typography } from '@mui/material'
import { changelogEntries, prUrl } from '../changelog/changelog'

type ChangelogListProps = {
    /** The side panel shows fewer entries than the full page */
    limit?: number
}

/** One line per release, newest first. Shared by the changelog page and the lobby side panel. */
export const ChangelogList = ({ limit }: ChangelogListProps) => (
    <List>
        {(limit ? changelogEntries.slice(0, limit) : changelogEntries).map((entry) => (
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
)
