import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './client/App'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from './client/theme'

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>
)
