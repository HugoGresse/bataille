import { Game } from './game/Game'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import React from 'react'
import { Home } from './screens/Home'
import { Lobby } from './screens/Lobby'
import { Admin } from './screens/Admin'
import { Changelog } from './screens/Changelog'
import { Leaderboard } from './screens/Leaderboard'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
    },
    {
        path: '/lobby',
        element: <Lobby />,
    },
    {
        path: '/g/:gameId',
        element: <Game />,
    },
    {
        path: '/admin/*',
        element: <Admin />,
    },
    {
        path: '/changelog',
        element: <Changelog />,
    },
    {
        path: '/leaderboard',
        element: <Leaderboard />,
    },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
