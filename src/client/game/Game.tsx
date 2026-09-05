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
import { getSocketConnectionInstance } from './SocketConnection'
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
    const [connectionLostOpen, setConnectionLostOpen] = useState<boolean>(false)
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
        const socketInstance = getSocketConnectionInstance()
        socketInstance?.setConnectionLostListener(() => setConnectionLostOpen(true))
        if (!socketInstance) {
            return
        }
        setMessages(socketInstance.getMessageLog())
        const stopListening = socketInstance.addMessageListener(() => setMessages(socketInstance.getMessageLog()))
        return () => {
            socketInstance.setConnectionLostListener(null)
            stopListening()
        }
    }, [])

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
                open={connectionLostOpen}
                aria-labelledby="connection-lost-title"
                aria-describedby="connection-lost-description">
                <DialogTitle id="connection-lost-title">Connection lost</DialogTitle>
                <DialogContent>
                    <DialogContentText id="connection-lost-description">
                        The connection to the game server was interrupted (network issue or server restart). The game
                        has ended, you will not receive any further updates.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={() => window.location.assign('/')}>
                        Back to menu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
