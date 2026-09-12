import React, { useEffect, useState } from 'react'
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import type { LeaderboardEntry } from '../../common/auth'
import { fetchLeaderboard } from '../auth/passkey'
import { useAccountSession } from '../auth/useAccountSession'

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

export const Leaderboard = () => {
    const session = useAccountSession()
    const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchLeaderboard()
            .then(setEntries)
            .catch((e) => setError(String(e)))
    }, [])

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 2 }}>
            <Box sx={{ width: '100%', maxWidth: 720 }}>
                <Button variant="contained" component={RouterLink} to="/" startIcon={<ArrowBack />}>
                    Go back
                </Button>
                <Typography variant="h2" sx={{ marginTop: 2, marginBottom: 2 }}>
                    Leaderboard
                </Typography>
                <Typography color="text.secondary" sx={{ marginBottom: 2 }}>
                    Signed-in players only. Every finished game counts, alone against AIs included; "vs humans" is wins
                    with at least one other person in the game.
                </Typography>
                {error ? <Typography color="error">{error}</Typography> : null}
                {entries === null && !error ? <CircularProgress /> : null}
                {entries?.length === 0 ? <Typography>No ranked game yet. Sign in and play one.</Typography> : null}
                {entries && entries.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>Player</TableCell>
                                    <TableCell align="right">Wins</TableCell>
                                    <TableCell align="right">vs humans</TableCell>
                                    <TableCell align="right">Games</TableCell>
                                    <TableCell align="right">Win rate</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.map((entry, index) => (
                                    <TableRow key={entry.accountId} selected={entry.accountId === session?.accountId}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{entry.name}</TableCell>
                                        <TableCell align="right">{entry.wins}</TableCell>
                                        <TableCell align="right">{entry.winsVsHumans}</TableCell>
                                        <TableCell align="right">{entry.games}</TableCell>
                                        <TableCell align="right">{percent(entry.winRate)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : null}
            </Box>
        </Box>
    )
}
