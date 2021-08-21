import React, { useEffect, useRef, useState } from 'react'
import { BatailleGame } from './game/BatailleGame'
import './game.css'
import { useHistory, useParams } from 'react-router-dom'
import { Box, Button } from '@material-ui/core'
import FullscreenIcon from '@material-ui/icons/Fullscreen'
import HelpIcon from '@material-ui/icons/HelpOutline'
import BackIcon from '@material-ui/icons/ArrowBack'
import { HelpDialog } from './HelpDialog'

type GameParams = {
    gameId: string
}

export const Game = () => {
    const history = useHistory()
    const { gameId } = useParams<GameParams>()
    const gameContainer = useRef<HTMLDivElement>(null)
    const [game, setGame] = useState<BatailleGame>()
    const [helpOpen, setHelpOpen] = useState<boolean>(false)

    useEffect(() => {
        if (gameContainer.current) {
            const game = new BatailleGame(gameContainer.current, gameId)
            BatailleGame.setCurrentGame(game)
            setGame(game)
            return () => {
                game.destroy()
            }
        }
    }, [gameId, gameContainer])

    return (
        <Box display="flex" flexDirection="column" height="100vh">
            <Box display="flex" justifyContent="space-between" margin={1}>
                <Button
                    color="secondary"
                    onClick={() => {
                        history.push('/')
                    }}
                    startIcon={<BackIcon />}>
                    Exit game
                </Button>
                <div>
                    <Button
                        color="secondary"
                        variant="outlined"
                        onClick={() => {
                            setHelpOpen(true)
                        }}
                        startIcon={<HelpIcon />}>
                        HELP
                    </Button>{' '}
                    <Button
                        color="secondary"
                        variant="outlined"
                        onClick={() => {
                            gameContainer.current?.requestFullscreen()
                            game?.setFullscreen()
                        }}
                        startIcon={<FullscreenIcon />}>
                        Fullscreen
                    </Button>
                </div>
            </Box>
            <Box display="flex" overflow="hidden">
                <div ref={gameContainer} id="gameContainer" />
            </Box>
            <HelpDialog
                open={helpOpen}
                setOpen={(shouldBeOpen) => {
                    setHelpOpen(shouldBeOpen)
                }}
            />
        </Box>
    )
}
