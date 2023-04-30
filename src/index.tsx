import React from 'react'
import ReactDOM from 'react-dom'
import App from './client/App'
import { CssBaseline, ThemeProvider } from '@material-ui/core'
import { theme } from './client/theme'

ReactDOM.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
)
