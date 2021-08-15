import { Game } from './Game'
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import React from 'react';
import { Home } from './Home';
import {Lobby} from './Lobby'

function App() {
    return (
        <Router>
            <Switch>
                <Route exact path="/">
                    <Home/>
                </Route>
                <Route exact path="/lobby">
                    <Lobby/>
                </Route>
                <Route path="/g/:gameId">
                    <Game/>
                </Route>
            </Switch>
        </Router>
    )
}

export default App
