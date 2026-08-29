import React, { useEffect, useMemo, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../game/utils/clientEnv'
import { ADMIN_ACTION, ADMIN_STATS, ADMIN_UPDATE, AdminActionsTypes } from '../../common/SOCKET_EMIT'
import { useQuery } from '../utils/hooks/useQuery'
import {
    Card,
    CardContent,
    Container,
    Grid,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { AdminUpdate } from '../../server/admin/types/AdminUpdate'
import { GameStatsSummary, IpGameCount } from '../../server/stats/GameStats'
import { getPlayerText } from '../game/scenes/UI/playerText'

const toISODate = (date: Date) => date.toISOString().slice(0, 10)

const daysAgo = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return toISODate(date)
}

const IpRows = ({ ips }: { ips: IpGameCount[] }) => (
    <>
        {ips.length === 0 && <Typography variant="caption">No address recorded</Typography>}
        {ips.map((entry, index) => (
            <Grid key={entry.ip} container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid size={1}>
                    <Typography variant="caption">{index + 1}.</Typography>
                </Grid>
                <Grid size={7}>
                    <Typography sx={{ fontFamily: 'monospace' }}>{entry.ip}</Typography>
                </Grid>
                <Grid size={2}>
                    <Typography align="right" variant="caption">
                        {entry.playerCount} {entry.playerCount === 1 ? 'name' : 'names'}
                    </Typography>
                </Grid>
                <Grid size={2}>
                    <Typography align="right">
                        <b>{entry.gameCount}</b>
                    </Typography>
                </Grid>
            </Grid>
        ))}
    </>
)

const BarChart = ({ title, data, unit }: { title: string; data: { label: string; value: number }[]; unit: string }) => {
    const max = Math.max(1, ...data.map((d) => d.value))
    return (
        <Card>
            <CardContent>
                <Typography variant="h6">{title}</Typography>
                {data.length === 0 && <Typography>No data on this range</Typography>}
                {data.map(({ label, value }) => (
                    <Grid key={label} container spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
                        <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" noWrap>
                                {label}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <div
                                style={{
                                    height: 14,
                                    width: `${(value / max) * 100}%`,
                                    minWidth: value > 0 ? 4 : 0,
                                    background: '#673ab7',
                                    borderRadius: 3,
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 2 }}>
                            <Typography variant="caption">
                                {Math.round(value * 10) / 10} {unit}
                            </Typography>
                        </Grid>
                    </Grid>
                ))}
            </CardContent>
        </Card>
    )
}

export const Admin = () => {
    const query = useQuery()
    const [isConnected, setConnected] = useState<boolean>(false)
    const [socket, setSocket] = useState<null | Socket>(null)
    const [state, setState] = useState<AdminUpdate>({
        games: [],
    })
    const [stats, setStats] = useState<GameStatsSummary | null>(null)
    const [ipGrouping, setIpGrouping] = useState<'total' | 'day' | 'month'>('total')
    const [rangeFrom, setRangeFrom] = useState<string>(daysAgo(30))
    const [rangeTo, setRangeTo] = useState<string>(toISODate(new Date()))

    const queryToken = query.get('token')

    useEffect(() => {
        if (!queryToken) {
            return
        }

        const socket = io(`${SOCKET_URL}/stats`, {
            auth: {
                token: queryToken,
            },
        })

        socket.on('connect', () => {
            setConnected(true)
            console.log('connected')
        })
        socket.on('disconnect', function () {
            setConnected(false)
            console.log('disconnect')
        })
        socket.on(ADMIN_UPDATE, (data: AdminUpdate) => {
            setState(data)
        })
        socket.on(ADMIN_STATS, (data: GameStatsSummary) => {
            setStats(data)
        })
        setSocket(socket)
        return () => {
            socket.disconnect()
        }
    }, [queryToken])

    useEffect(() => {
        if (!socket || !isConnected || !rangeFrom || !rangeTo) {
            return
        }
        socket.emit(
            ADMIN_ACTION,
            {
                type: AdminActionsTypes.getStats,
                payload: { from: rangeFrom, to: rangeTo },
            },
            queryToken
        )
    }, [socket, isConnected, rangeFrom, rangeTo, queryToken, state.games.length])

    const durationByDay = useMemo(
        () => (stats?.gameDurationByDay ?? []).map(({ day, totalMinutes }) => ({ label: day, value: totalMinutes })),
        [stats]
    )
    const humansByDay = useMemo(
        () => (stats?.humanPlayersByDay ?? []).map(({ day, value }) => ({ label: day, value })),
        [stats]
    )
    const ipPeriods = useMemo(
        () => (ipGrouping === 'day' ? (stats?.gamesByIpByDay ?? []) : (stats?.gamesByIpByMonth ?? [])),
        [stats, ipGrouping]
    )
    const totalHours = useMemo(
        () => (stats?.gameDurationByDay ?? []).reduce((acc, day) => acc + day.totalMinutes, 0) / 60,
        [stats]
    )

    if (!isConnected) {
        return <div>Not connected...</div>
    }

    return (
        <Container maxWidth="lg">
            <br />
            <Grid container spacing={2}>
                <Grid size={{ sm: 12 }}>
                    <TextField
                        placeholder="Send message to all games"
                        fullWidth={true}
                        onKeyDown={(ev: any) => {
                            if (ev.key === 'Enter') {
                                if (socket) {
                                    socket.emit(
                                        ADMIN_ACTION,
                                        {
                                            type: AdminActionsTypes.sendMessage,
                                            payload: {
                                                message: ev.target.value,
                                            },
                                        },
                                        queryToken
                                    )
                                }
                                ev.preventDefault()
                            }
                        }}
                    />
                </Grid>

                <Grid size={{ sm: 12 }}>
                    <Typography variant="h3" sx={{ textAlign: 'center' }}>
                        Ongoing Games: <b>{state.games.length}</b>
                    </Typography>
                </Grid>

                {state.games.map((game) => (
                    <Grid key={game.id} size={{ sm: 6 }}>
                        <Card>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="h6">
                                            <b>Id:</b> {game.id}
                                        </Typography>
                                        <Typography>
                                            <b>Duration:</b> <b>{game.duration}</b> minutes
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography>
                                            <b>Players:</b> {game.players.length}
                                        </Typography>
                                        {game.players.map((player, index) => (
                                            <Typography key={player.n}>{getPlayerText(index, player)}</Typography>
                                        ))}
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                <Grid size={{ sm: 12 }} sx={{ mt: 3 }}>
                    <Typography variant="h4">Statistics</Typography>
                </Grid>

                <Grid size={{ sm: 12 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="From"
                                type="date"
                                size="small"
                                fullWidth
                                value={rangeFrom}
                                onChange={(ev) => setRangeFrom(ev.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="To"
                                type="date"
                                size="small"
                                fullWidth
                                value={rangeTo}
                                onChange={(ev) => setRangeTo(ev.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid size={{ sm: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Total players</Typography>
                            <Typography variant="h3">{stats?.totalPlayerCount ?? '–'}</Typography>
                            <Typography variant="caption">distinct humans in range</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ sm: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Games played</Typography>
                            <Typography variant="h3">{stats?.gameCount ?? '–'}</Typography>
                            <Typography variant="caption">in range</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ sm: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Total playtime</Typography>
                            <Typography variant="h3">{Math.round(totalHours * 10) / 10}h</Typography>
                            <Typography variant="caption">sum of game durations in range</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ sm: 12, md: 6 }}>
                    <BarChart title="Game duration by day" data={durationByDay} unit="min" />
                </Grid>
                <Grid size={{ sm: 12, md: 6 }}>
                    <BarChart title="Human players by day" data={humansByDay} unit="players" />
                </Grid>

                <Grid size={{ sm: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Games by IP address</Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={ipGrouping}
                                    onChange={(_event, value) => value && setIpGrouping(value)}>
                                    <ToggleButton value="total">Total</ToggleButton>
                                    <ToggleButton value="day">By day</ToggleButton>
                                    <ToggleButton value="month">By month</ToggleButton>
                                </ToggleButtonGroup>
                            </Grid>

                            {ipGrouping === 'total' && (
                                <>
                                    {(stats?.gamesByIp ?? []).length === 0 && (
                                        <Typography>No data on this range</Typography>
                                    )}
                                    <IpRows ips={stats?.gamesByIp ?? []} />
                                </>
                            )}

                            {ipGrouping !== 'total' && (
                                <>
                                    {ipPeriods.length === 0 && <Typography>No data on this range</Typography>}
                                    {ipPeriods.map((bucket) => (
                                        <Grid key={bucket.period} sx={{ marginTop: 1.5 }}>
                                            <Typography variant="subtitle2">
                                                {bucket.period}{' '}
                                                <Typography component="span" variant="caption">
                                                    ({bucket.gameCount} {bucket.gameCount === 1 ? 'game' : 'games'})
                                                </Typography>
                                            </Typography>
                                            <IpRows ips={bucket.ips} />
                                        </Grid>
                                    ))}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ sm: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Top players (game count)</Typography>
                            {(stats?.topPlayers ?? []).length === 0 && <Typography>No data on this range</Typography>}
                            {stats?.topPlayers.map((player, index) => (
                                <Grid key={player.name} container spacing={1} sx={{ alignItems: 'center' }}>
                                    <Grid size={1}>
                                        <Typography variant="caption">{index + 1}.</Typography>
                                    </Grid>
                                    <Grid size={9}>
                                        <Typography>{player.name}</Typography>
                                    </Grid>
                                    <Grid size={2}>
                                        <Typography align="right">
                                            <b>{player.gameCount}</b>
                                        </Typography>
                                    </Grid>
                                </Grid>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}
