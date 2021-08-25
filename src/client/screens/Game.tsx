import React, { useEffect, useRef, useState } from 'react'
import { BatailleGame } from '../game/BatailleGame'
import './game.css'
import { useParams } from 'react-router-dom'
import { Box, Button } from '@material-ui/core'
import FullscreenIcon from '@material-ui/icons/Fullscreen'
import BackIcon from '@material-ui/icons/ArrowBack'
import { HelpDialogButton } from './HelpDialog'
import { MessageDialog } from './MessageDialog'
import { DeferredPromise } from '../utils/Deferred'

type GameParams = {
    gameId: string
}

export const Game = () => {
    const { gameId } = useParams<GameParams>()
    const gameContainer = useRef<HTMLDivElement>(null)
    const [game, setGame] = useState<BatailleGame>()
    const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false)
    const [deferredPromise, setDeferredPromise] = useState<null | DeferredPromise<string | null>>(null)

    useEffect(() => {
        if (gameContainer.current) {
            const game = new BatailleGame(gameContainer.current, gameId, () => {
                const deferredPromise = new DeferredPromise<string | null>()
                setMessageDialogOpen(true)
                setDeferredPromise(deferredPromise)

                return deferredPromise
            })
            BatailleGame.setCurrentGame(game)
            setGame(game)
            return () => {
                game.destroy()
                BatailleGame.clearCurrentGame()
            }
        }
    }, [gameId, gameContainer])

    return (
        <Box display="flex" flexDirection="column" height="100vh">
            <Box display="flex" justifyContent="space-between" margin={1}>
                <Button color="secondary" href="/" startIcon={<BackIcon />}>
                    Exit game
                </Button>
                <div>
                    <HelpDialogButton color="secondary" buttonText={'HELP'} />{' '}
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
            <MessageDialog
                open={messageDialogOpen}
                onSubmit={(content) => {
                    setMessageDialogOpen(false)
                    if (deferredPromise) {
                        deferredPromise.resolve(content)

                        setDeferredPromise(null)
                    }
                }}
            />
        </Box>
    )
}
