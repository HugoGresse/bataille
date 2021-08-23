import React, { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@material-ui/core'
import { DonatingBanner } from './DonatingBanner'
import { Link as RouterLink, useHistory } from 'react-router-dom'
import { getSocketConnectionInstance, newSocketConnectionInstance } from '../game/SocketConnection'
import { ArrowBack } from '@material-ui/icons'
import { LobbyState } from '../../server/GameLobby'

export const Lobby = () => {
    const history = useHistory()
    const [lobbyState, setLobbyState] = useState<LobbyState>({
        playerCountForceStart: 0,
        requiredPlayerCount: 0,
        playerCount: 0,
    })
    const [forceStart, setForceStart] = useState(false)

    const onForceStartPress = () => {
        const forceStartValue = !forceStart
        setForceStart(forceStartValue)
        const socketConnection = getSocketConnectionInstance()
        if (socketConnection) {
            socketConnection.sendForceStart(forceStartValue)
        }
    }

    useEffect(() => {
        newSocketConnectionInstance(
            (lobbyState) => {
                setLobbyState(lobbyState)
            },
            (gameId: string) => {
                history.push(`/g/${gameId}/`)
            }
        )
        return () => {
            const instance = getSocketConnectionInstance()
            if (instance) {
                instance.disconnect()
            }
        }
    }, [history])

    return (
        <Box
            display="flex"
            flex={1}
            minHeight="100vh"
            alignItems="center"
            justifyContent="space-between"
            flexDirection="column">
            <Box>
                <br />
                <Button variant="contained" size="large" component={RouterLink} to="/" startIcon={<ArrowBack />}>
                    Go back
                </Button>
            </Box>

            <Box>
                <Typography variant="h3">
                    Waiting for more players... {lobbyState.playerCount}/{lobbyState.requiredPlayerCount}
                </Typography>
                <br />
                <Button variant={forceStart ? 'contained' : 'outlined'} size="large" onClick={onForceStartPress}>
                    Force start ({lobbyState.playerCountForceStart}/
                    {lobbyState.playerCount > 1 ? lobbyState.playerCount : 2})
                </Button>
            </Box>

            <DonatingBanner />
        </Box>
    )
}
