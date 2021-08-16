import React from 'react'
import {Box, Button, Link, Typography} from '@material-ui/core'
import packageJson from '../../../package.json';

export const DonatingBanner = () => {

    return <Box padding={2} textAlign="center">
        <Typography variant="h5"> Consider donating to support this game.</Typography>
        <Typography variant="body1" maxWidth={600} marginTop={1}>
            This <Link href="https://github.com/HugoGresse/bataille" target="_blank"
                       color="secondary">open-source</Link> game should always stay free and without ads.
            Consider donating to support the server cost and future developments.
        </Typography>
        <br/>
        <Button variant="contained" href="https://github.com/sponsors/HugoGresse?frequency=one-time" target="_blank">DONATE anything</Button>

        <br/>
        <br/>
        <Typography variant="body2">v{packageJson.version}</Typography>
    </Box>

}
