import React, {useEffect, useRef, useState} from 'react'
import {BatailleGame} from './game/BatailleGame'
import "./game.css"
import {useParams} from 'react-router-dom'

type GameParams = {
    gameId: string
}

export const Game = () => {
    const { gameId } = useParams<GameParams>();
    const gameContainer = useRef<HTMLDivElement>(null);
    const [game, setGame] = useState<BatailleGame>()

    useEffect(() => {
            if(gameContainer.current) {
                const game = new BatailleGame(gameContainer.current, gameId)
                BatailleGame.setCurrentGame(game)
                setGame(game)
                return () => {
                    game.destroy()
                }
            }
    }, [gameId, gameContainer])

    return <div>
        <div style={{textAlign: "right"}}>
            <button onClick={() => {
                game && game.destroy()
                console.log("destroyed")
            }}>Destroy</button>
            <button onClick={() => {
                game && game.clearGame()
                console.log("clearGame")
            }}>Clear server</button>
        </div>
        <div ref={gameContainer} id="gameContainer">
        </div>
    </div>
}
