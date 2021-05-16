import React, {useEffect, useRef, useState} from 'react'
import {BatailleGame} from './game/BatailleGame'
import "./game.css"

export const Game = () => {
    const gameContainer = useRef<HTMLDivElement>(null);
    const [game, setGame] = useState<BatailleGame>()

    const newGame = () => {
        if(gameContainer.current) {
            const game = new BatailleGame(gameContainer.current)
            BatailleGame.setCurrentGame(game)
            setGame(game)
            return () => {
                game.destroy()
            }
        }
    }

    useEffect(() => {
        return newGame()
    }, [gameContainer])

    return <div>
        <div style={{textAlign: "right"}}>
            <button onClick={newGame        }>new</button>
            <button onClick={() => {
                game && game.destroy()
                console.log("destroyed")
            }}>Destroy</button>
        </div>
        <div ref={gameContainer} id="gameContainer"/>
    </div>
}
