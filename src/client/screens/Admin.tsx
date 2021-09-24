import React, { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../game/utils/clientEnv'
import { ADMIN_ACTION, ADMIN_UPDATE, AdminActionsTypes } from '../../common/SOCKET_EMIT'
import { useQuery } from '../utils/hooks/useQuery'
import { Card, CardContent, Container, Grid, TextField, Typography } from '@material-ui/core'
import { AdminUpdate } from '../../server/admin/types/AdminUpdate'
import { getPlayerText } from '../game/scenes/UI/ScoresStats'

export const Admin = () => {
    const query = useQuery()
    const [isConnected, setConnected] = useState<boolean>(false)
    const [socket, setSocket] = useState<null | Socket>(null)
    const [state, setState] = useState<AdminUpdate>({
        games: [],
    })

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
        setSocket(socket)
        return () => {
            socket.disconnect()
        }
    }, [queryToken])

    if (!isConnected) {
        return <div>Not connected...</div>
    }

    return (
        <Container maxWidth="lg">
            <br />
            <Grid container spacing={2}>
                <Grid item sm={12}>
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

                <Grid item sm={12}>
                    <Typography variant="h3" textAlign="center">
                        Ongoing Games: <b>{state.games.length}</b>
                    </Typography>
                </Grid>

                {state.games.map((game) => (
                    <Grid key={game.id} item sm={6}>
                        <Card>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="h6">
                                            <b>Id:</b> {game.id}
                                        </Typography>
                                        <Typography>
                                            <b>Duration:</b> <b>{game.duration}</b> minutes
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography>
                                            <b>Players:</b> {game.players.length}
                                        </Typography>
                                        <Grid>
                                            {game.players.map((player, index) => (
                                                <Grid key={player.n}>
                                                    <Typography>{getPlayerText(index, player)}</Typography>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    )
}
