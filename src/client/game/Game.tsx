import React, { useEffect, useRef, useState } from 'react'
import { BatailleGame } from './BatailleGame'
import '../screens/game.css'
import { useBlocker, useParams } from 'react-router-dom'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import BackIcon from '@mui/icons-material/ArrowBack'
import FeedbackIcon from '@mui/icons-material/Feedback'
import FlagIcon from '@mui/icons-material/Flag'
import { HelpDialogButton } from '../screens/HelpDialog'
import { MessageDialog } from '../screens/MessageDialog'
import { DeferredPromise } from '../utils/Deferred'
import { ConnectionPhase, getSocketConnectionInstance, newSocketConnectionInstance } from './SocketConnection'
import { ReceivedMessage } from './chat/chatLog'

type GameParams = {
    gameId: string
}

export const Game = () => {
    const { gameId } = useParams<GameParams>()
    const gameTopContainer = useRef<HTMLDivElement>(null)
    const gameContainer = useRef<HTMLDivElement>(null)
    const [game, setGame] = useState<BatailleGame>()
    const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false)
    const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase | null>(null)
    /** Bumped when the seat comes back with a fresh full state: the board is rebuilt from it */
    const [generation, setGeneration] = useState(0)
    const [deferredPromise, setDeferredPromise] = useState<null | DeferredPromise<string | null>>(null)
    const [messages, setMessages] = useState<ReceivedMessage[]>([])
    const [surrenderDialogOpen, setSurrenderDialogOpen] = useState<boolean>(false)
    const [surrendered, setSurrendered] = useState<boolean>(
        () => getSocketConnectionInstance()?.getLatestState()?.cp.s ?? false
    )
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
        // Landing here without a socket means the page was reloaded mid-game: ask for the seat back
        // instead of the lobby, and only build the board once the server has handed the game over
        if (!getSocketConnectionInstance()) {
            newSocketConnectionInstance(
                () => {},
                () => {},
                { rejoinGameId: gameId }
            )
        }
        const socketInstance = getSocketConnectionInstance()
        if (!socketInstance) {
            return
        }
        socketInstance.setConnectionListener((phase) => {
            setConnectionPhase(phase === 'rejoined' ? null : phase)
            if (phase === 'rejoined') {
                setGeneration((current) => current + 1)
            }
        })
        setMessages(socketInstance.getMessageLog())
        const stopListening = socketInstance.addMessageListener(() => setMessages(socketInstance.getMessageLog()))
        return () => {
            socketInstance.setConnectionListener(null)
            stopListening()
        }
    }, [gameId])

    useEffect(() => {
        if (gameContainer.current && getSocketConnectionInstance()?.gameStartData) {
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
    }, [gameId, gameContainer, generation])

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', margin: 1 }}>
                <Button
                    color="secondary"
                    href="/"
                    startIcon={<BackIcon />}
                    onClick={(event) => {
                        // Leaving on purpose gives the seat up now, instead of leaving a ghost for a minute
                        event.preventDefault()
                        getSocketConnectionInstance()?.disconnect()
                        window.location.assign('/')
                    }}>
                    Exit game
                </Button>
                <div>
                    <Button
                        color="secondary"
                        href="https://discord.gg/tQP5TVD9js"
                        target="_blank"
                        startIcon={<FeedbackIcon />}>
                        Discord (feedbacks/news)
                    </Button>{' '}
                    <HelpDialogButton color="secondary" buttonText={'HELP'} />{' '}
                    <Button
                        color="secondary"
                        variant="outlined"
                        disabled={surrendered}
                        onClick={() => setSurrenderDialogOpen(true)}
                        startIcon={<FlagIcon />}>
                        {surrendered ? 'Surrendered' : 'Surrender'}
                    </Button>{' '}
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
                messages={messages}
                onSubmit={(content) => {
                    setMessageDialogOpen(false)
                    if (deferredPromise) {
                        deferredPromise.resolve(content)
                        setDeferredPromise(null)
                    }
                }}
            />
            <Dialog
                open={surrenderDialogOpen}
                onClose={() => setSurrenderDialogOpen(false)}
                container={() => document.getElementById('gameTopContainer')}
                aria-labelledby="surrender-title"
                aria-describedby="surrender-description">
                <DialogTitle id="surrender-title">Surrender?</DialogTitle>
                <DialogContent>
                    <DialogContentText id="surrender-description">
                        Your army disbands and your towns go back to neutral. You stay to watch the game end, and can
                        still chat. There is no coming back from this.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSurrenderDialogOpen(false)}>Keep fighting</Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => {
                            game?.surrender()
                            setSurrendered(true)
                            setSurrenderDialogOpen(false)
                        }}>
                        Surrender
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={connectionPhase !== null}
                aria-labelledby="connection-lost-title"
                aria-describedby="connection-lost-description">
                <DialogTitle id="connection-lost-title">
                    {connectionPhase === 'gone' ? 'Connection lost' : 'Reconnecting…'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="connection-lost-description">
                        {connectionPhase === 'gone'
                            ? 'Your seat is gone: either the game ended, or you were away for more than a minute and the others carried on without you.'
                            : 'The connection to the game server dropped. Your seat is kept for a minute while it comes back; the game goes on meanwhile.'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant={connectionPhase === 'gone' ? 'contained' : 'text'}
                        onClick={() => window.location.assign('/')}>
                        Back to menu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
