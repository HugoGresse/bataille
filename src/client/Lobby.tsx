import React, {useEffect, useState} from 'react'
import {Box, Button,  Typography} from '@material-ui/core'
import {DonatingBanner} from './screens/DonatingBanner'
import {Link as RouterLink, useHistory} from 'react-router-dom'
import {newSocketConnectionInstance} from './SocketConnection'
import {ArrowBack} from '@material-ui/icons'
import {LobbyState} from '../server/GameLobby'

export const Lobby = () => {
    const history = useHistory();
    const [lobbyState, setLobbyState] = useState<LobbyState>({
        playerCountForceStart: 0,
        requiredPlayerCount: 0,
        playerCount: 0
    })

    useEffect(() => {
        newSocketConnectionInstance(
            (lobbyState) => {
                setLobbyState(lobbyState)
        },(gameId: string) => {
                history.push(`/g/${gameId}/`)
            }
        )
    }, [history])


    return <Box display="flex" flex={1} minHeight="100vh" alignItems="center" justifyContent="space-between"
                flexDirection="column">
        <Box>
            <br/>
            <Button variant="contained" size="large"  component={RouterLink} to="/" startIcon={<ArrowBack/>}>
                Go back
            </Button>
        </Box>

        <Box>
            <Typography variant="h3">Waiting for more players... {lobbyState.playerCount}/{lobbyState.requiredPlayerCount}</Typography>
            <br/>
            <Button variant="outlined" size="large">
                Force start ({lobbyState.playerCountForceStart}/{lobbyState.playerCount})
            </Button>

        </Box>

        <DonatingBanner/>

    </Box>


}
