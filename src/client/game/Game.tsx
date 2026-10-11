import React, { useEffect, useRef, useState } from 'react'
import { BatailleGame } from './BatailleGame'
import '../screens/game.css'
import { useBlocker, useParams, useSearchParams } from 'react-router-dom'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useMediaQuery,
} from '@mui/material'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import BackIcon from '@mui/icons-material/ArrowBack'
import FeedbackIcon from '@mui/icons-material/Feedback'
import FlagIcon from '@mui/icons-material/Flag'
import { HelpDialogButton } from '../screens/HelpDialog'
import { MessageDialog } from '../screens/MessageDialog'
import { DeferredPromise } from '../utils/Deferred'
import { ConnectionPhase, getSocketConnectionInstance, newSocketConnectionInstance } from './SocketConnection'
import { ReceivedMessage } from './chat/chatLog'
import { GameMenu } from './GameMenu'
import { COMPACT_QUERY, DISCORD_URL } from './compactLayout'

type GameParams = {
    gameId: string
}

/** Leaving on purpose closes the socket first, so the seat is given up at once rather than left a
 *  ghost for a minute; if the socket is already down the server still holds the seat, and the next
 *  visit is offered it back rather than silently reseated. */
const leaveForMenu = () => {
    getSocketConnectionInstance()?.disconnect()
    window.location.assign('/')
}

export const Game = () => {
    const { gameId } = useParams<GameParams>()
    const [searchParams] = useSearchParams()
    const spectateToken = searchParams.get('spectate')
    const isSpectator = !!spectateToken
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
    // Phones get the map edge to edge: the toolbar folds into a menu floating over the canvas
    // noSsr: read on the first render, or a phone commits the full toolbar before hiding it
    const compact = useMediaQuery(COMPACT_QUERY, { noSsr: true })

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
                spectateToken && gameId ? { spectate: { gameId, token: spectateToken } } : { rejoinGameId: gameId }
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
    }, [gameId, spectateToken])

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

    const exitLabel = isSpectator ? 'Back to admin' : 'Exit game'
    const exit = () => {
        if (isSpectator) {
            getSocketConnectionInstance()?.disconnect()
            window.location.assign(`/admin?token=${encodeURIComponent(spectateToken!)}`)
        } else {
            leaveForMenu()
        }
    }
    const enterFullscreen = () => {
        // iPhone Safari has no element fullscreen at all
        gameTopContainer.current?.requestFullscreen?.()
        game?.setFullscreen()
    }

    return (
        // dvh, not vh: on a phone 100vh counts the space under the browser's own toolbar, so the
        // bottom of the map sat hidden behind it
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                '@supports (height: 100dvh)': { height: '100dvh' },
            }}>
            <Box sx={{ display: compact ? 'none' : 'flex', justifyContent: 'space-between', margin: 1 }}>
                <Button
                    color="secondary"
                    href={isSpectator ? `/admin?token=${encodeURIComponent(spectateToken!)}` : '/'}
                    startIcon={<BackIcon />}
                    onClick={(event) => {
                        event.preventDefault()
                        exit()
                    }}>
                    {exitLabel}
                </Button>
                <div>
                    <Button color="secondary" href={DISCORD_URL} target="_blank" startIcon={<FeedbackIcon />}>
                        Discord (feedbacks/news)
                    </Button>{' '}
                    <HelpDialogButton color="secondary" buttonText={'HELP'} />{' '}
                    {isSpectator ? (
                        <Chip color="secondary" variant="outlined" label="Spectating (admin)" sx={{ mx: 0.5 }} />
                    ) : (
                        <Button
                            color="secondary"
                            variant="outlined"
                            disabled={surrendered}
                            onClick={() => setSurrenderDialogOpen(true)}
                            startIcon={<FlagIcon />}>
                            {surrendered ? 'Surrendered' : 'Surrender'}
                        </Button>
                    )}{' '}
                    <Button
                        color="secondary"
                        variant="outlined"
                        onClick={enterFullscreen}
                        startIcon={<FullscreenIcon />}>
                        Fullscreen
                    </Button>
                </div>
            </Box>
            <Box
                sx={{ display: 'flex', overflow: 'hidden', position: 'relative' }}
                ref={gameTopContainer}
                id="gameTopContainer">
                <div ref={gameContainer} id="gameContainer" />
                {compact && (
                    <GameMenu
                        exitLabel={exitLabel}
                        spectating={isSpectator}
                        onExit={exit}
                        onSurrender={isSpectator ? null : () => setSurrenderDialogOpen(true)}
                        surrendered={surrendered}
                        onFullscreen={enterFullscreen}
                        container={() => gameTopContainer.current}
                    />
                )}
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
                    <Button variant={connectionPhase === 'gone' ? 'contained' : 'text'} onClick={leaveForMenu}>
                        Back to menu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
