import React, {useEffect} from 'react'
import {Box, Button,  Typography} from '@material-ui/core'
import {DonatingBanner} from './screens/DonatingBanner'
import {Link as RouterLink, useHistory} from 'react-router-dom'
import {newSocketConnectionInstance} from './SocketConnection'
import {ArrowBack} from '@material-ui/icons'

export const Lobby = () => {
    const history = useHistory();

    useEffect(() => {
        newSocketConnectionInstance((gameId: string) => {
            history.push(`/g/${gameId}/`)
        })
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
            <Typography variant="h3">Waiting for more players... 29/112</Typography>
            <br/>
            <Button variant="outlined" size="large">
                Force start (1/2)
            </Button>

        </Box>

        <DonatingBanner/>

    </Box>


}
