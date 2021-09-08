import { Game } from './game/Game'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import React from 'react'
import { Home } from './screens/Home'
import { Lobby } from './screens/Lobby'
import { Admin } from './screens/Admin'

function App() {
    return (
        <Router>
            <Switch>
                <Route exact path="/">
                    <Home />
                </Route>
                <Route exact path="/lobby">
                    <Lobby />
                </Route>
                <Route path="/g/:gameId">
                    <Game />
                </Route>
                <Route path="/admin/">
                    <Admin />
                </Route>
            </Switch>
        </Router>
    )
}

export default App
