import { Game } from './game/Game'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import React from 'react'
import { Home } from './screens/Home'
import { Lobby } from './screens/Lobby'
import { Admin } from './screens/Admin'

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
])

function App() {
    return <RouterProvider router={router} />
}

export default App
