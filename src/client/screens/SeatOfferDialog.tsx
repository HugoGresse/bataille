import React from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { SeatOffer } from '../../server/seats'

type Props = {
    offer: SeatOffer | null
    onResume: (gameId: string) => void
    onGiveUp: () => void
}

/**
 * Back in the lobby with a game still running elsewhere. Neither answer is assumed: a crashed tab
 * wants its seat back, a bored one wants a fresh game, and only the player knows which this is.
 */
export const SeatOfferDialog = ({ offer, onResume, onGiveUp }: Props) => (
    <Dialog open={!!offer} aria-labelledby="seat-offer-title" aria-describedby="seat-offer-description">
        <DialogTitle id="seat-offer-title">A game of yours is still running</DialogTitle>
        <DialogContent>
            <DialogContentText id="seat-offer-description">
                You are still seated as {offer?.playerName} in a game in progress. Take the seat back, or give it up and
                queue for a new game?
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={onGiveUp}>New game</Button>
            <Button variant="contained" onClick={() => offer && onResume(offer.gameId)}>
                Resume game
            </Button>
        </DialogActions>
    </Dialog>
)
