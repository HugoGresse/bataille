import React, { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@material-ui/core'
import { DonatingBanner } from './DonatingBanner'
import { Link as RouterLink, useHistory } from 'react-router-dom'
import { getSocketConnectionInstance, newSocketConnectionInstance } from '../game/SocketConnection'
import { ArrowBack } from '@material-ui/icons'
import { LobbyState } from '../../server/GameLobby'
import { HelpDialogButton } from './HelpDialog'

export const Lobby = () => {
    const history = useHistory()
    const [lobbyState, setLobbyState] = useState<LobbyState>({
        playerCountForceStart: 0,
        requiredPlayerCount: 0,
        playerCount: 0,
        countdown: 0,
        ongoingGame: 0,
        waitForHuman: false,
    })
    const [forceStart, setForceStart] = useState(false)

    const onForceStartPress = () => {
        const forceStartValue = !forceStart
        setForceStart(forceStartValue)
        getSocketConnectionInstance()?.sendForceStart(forceStartValue)
    }

    const onWaitForHumanPress = () => {
        getSocketConnectionInstance()?.sendWaitForHuman()
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
                <Button
                    variant="contained"
                    size="large"
                    component={RouterLink}
                    to="/"
                    startIcon={<ArrowBack />}
                    onClick={() => {
                        const instance = getSocketConnectionInstance()
                        if (instance) {
                            instance.disconnect()
                        }
                    }}>
                    Go back
                </Button>
                <br />
                <br />
                <Typography color="#BBB">{lobbyState.ongoingGame} running game(s)</Typography>
            </Box>

            <Box>
                <Typography variant="h3">
                    Waiting for more players... {lobbyState.playerCount}/{lobbyState.requiredPlayerCount}
                </Typography>
                {!lobbyState.waitForHuman && lobbyState.countdown ? (
                    <Typography>Game starting in {lobbyState.countdown}s</Typography>
                ) : null}
                {lobbyState.waitForHuman ? (
                    <Typography>Waiting another player before starting the game (wait for human ON)</Typography>
                ) : null}
                <br />

                <Box display="flex" justifyContent="space-between">
                    <Box display="flex" flexDirection="column">
                        <Button
                            variant={forceStart ? 'contained' : 'outlined'}
                            size="large"
                            onClick={onForceStartPress}>
                            Force start ({lobbyState.playerCountForceStart}/
                            {lobbyState.playerCount > 1 ? lobbyState.playerCount : 2})
                        </Button>
                        <br />
                        <Button
                            variant={lobbyState.waitForHuman ? 'contained' : 'outlined'}
                            size="large"
                            onClick={onWaitForHumanPress}>
                            Wait for human: {lobbyState.waitForHuman ? 'on' : 'off'}
                        </Button>
                    </Box>

                    <HelpDialogButton
                        style={{
                            float: 'right',
                        }}
                    />
                </Box>
            </Box>

            <DonatingBanner />
        </Box>
    )
}
