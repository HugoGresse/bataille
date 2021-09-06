import React, { useEffect, useRef, useState } from 'react'
import { BatailleGame } from './BatailleGame'
import '../screens/game.css'
import { useHistory, useParams } from 'react-router-dom'
import { Box, Button } from '@material-ui/core'
import FullscreenIcon from '@material-ui/icons/Fullscreen'
import BackIcon from '@material-ui/icons/ArrowBack'
import FeedbackIcon from '@material-ui/icons/Feedback'
import { HelpDialogButton } from '../screens/HelpDialog'
import { MessageDialog } from '../screens/MessageDialog'
import { DeferredPromise } from '../utils/Deferred'

type GameParams = {
    gameId: string
}

export const Game = () => {
    const history = useHistory()
    const { gameId } = useParams<GameParams>()
    const gameTopContainer = useRef<HTMLDivElement>(null)
    const gameContainer = useRef<HTMLDivElement>(null)
    const [game, setGame] = useState<BatailleGame>()
    const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false)
    const [deferredPromise, setDeferredPromise] = useState<null | DeferredPromise<string | null>>(null)

    useEffect(() => {
        // This prevent the user from going back using the Back button
        // The push is done two times. The first one from the lobby, to get there, and a second one here to go back to
        // this route on back press
        history.push(`/g/${gameId}/`)
        return history.listen((newLocation, action) => {
            if (action === 'POP') {
                // If a "POP" action event occurs,
                // Send user back to the originating location
                history.go(1)
            }
        })
    }, [history, gameId])

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
            <Box display="flex" overflow="hidden" ref={gameTopContainer} id="gameTopContainer">
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
