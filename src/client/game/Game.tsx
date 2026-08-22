import React, { useEffect, useRef, useState } from 'react'
import { BatailleGame } from './BatailleGame'
import '../screens/game.css'
import { useBlocker, useParams } from 'react-router-dom'
import { Box, Button } from '@mui/material'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import BackIcon from '@mui/icons-material/ArrowBack'
import FeedbackIcon from '@mui/icons-material/Feedback'
import { HelpDialogButton } from '../screens/HelpDialog'
import { MessageDialog } from '../screens/MessageDialog'
import { DeferredPromise } from '../utils/Deferred'

type GameParams = {
    gameId: string
}

export const Game = () => {
    const { gameId } = useParams<GameParams>()
    const gameTopContainer = useRef<HTMLDivElement>(null)
    const gameContainer = useRef<HTMLDivElement>(null)
    const [game, setGame] = useState<BatailleGame>()
    const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false)
    const [deferredPromise, setDeferredPromise] = useState<null | DeferredPromise<string | null>>(null)
    const blocker = useBlocker(true)

    useEffect(() => {
        // This prevents the user from going back using the browser Back button:
        // the blocked POP navigation is immediately cancelled by going forward again
        if (blocker.state === 'blocked') {
            window.history.forward()
            blocker.reset()
        }
    }, [blocker])

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
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', margin: 1 }}>
                <Button color="secondary" href="/" startIcon={<BackIcon />}>
                    Exit game
                </Button>
                <div>
                    <Button
                        color="secondary"
                        href="https://discord.gg/tDhG5FnK"
                        target="_blank"
                        startIcon={<FeedbackIcon />}>
                        Discord (feedbacks/news)
                    </Button>{' '}
                    <HelpDialogButton color="secondary" buttonText={'HELP'} />{' '}
                    <Button
                        color="secondary"
                        variant="outlined"
                        onClick={() => {
                            gameTopContainer.current?.requestFullscreen()
                            game?.setFullscreen()
                        }}
                        startIcon={<FullscreenIcon />}>
                        Fullscreen
                    </Button>
                </div>
            </Box>
            <Box sx={{ display: 'flex', overflow: 'hidden' }} ref={gameTopContainer} id="gameTopContainer">
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
