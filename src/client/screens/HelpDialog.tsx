import React, { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core'
import HelpIcon from '@material-ui/icons/HelpOutline'

export type HelpDialogProps = {
    open: boolean
    setOpen: (open: boolean) => void
}

export const HelpDialog = ({ open, setOpen }: HelpDialogProps) => {
    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            fullWidth={true}
            maxWidth={'md'}>
            <DialogTitle id="alert-dialog-title">How to play</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    <b>GOAL</b>
                    <p>Conquer all countries until other players have no remaining units (Free For All)</p>
                    <b>HOW TO</b>
                    <ul>
                        <li>On game start, you will be assigned a color as well as some units/towns.</li>
                        <li>
                            Towns are displayed using a small house icon with the name of the city on top. Their border
                            represent who owns it. No colors = neutral.
                        </li>
                        <li>
                            Units are displayed by a black circle with a colored number inside. They can be created on
                            towns you own. The number represent the amount of units on a given location. You cannot
                            split them (yet) but can merge them. A group of unit cannot be created with more than 100
                            (but can be merged to achieve more units on a single location).
                        </li>
                        <li>
                            Every 7s, your available money will increase. Every players has a minimum of 4, + the income
                            of each owned countries (display under parenthesis).
                        </li>
                        <li>
                            You need to capture all towns of a country to own it. The country color will change to match
                            your color when captured.
                        </li>
                        <li>To capture a town, move enough units on them by dragging them on the destination.</li>
                        <li>Water slows down your units, but they can still goes through.</li>
                    </ul>
                    <b>CONTROLS</b>
                    <ul>
                        <li>ZQSD/WQSD: move the camera</li>
                        <li>R: create one unit on selected town</li>
                        <li>T: create 10 units on selected town, (less if not enough money)</li>
                        <li>ENTER: open dialog chat</li>
                    </ul>
                </DialogContentText>
                <DialogContentText id="alert-dialog-description">
                    <b>TIPS</b>
                    <ul>
                        <li>
                            Beginning on the game: conquer lots of small countries by using most of the pre-given units.
                        </li>
                        <li>
                            You cannot fight on all fronts, make allies, or isolate yourself (edge of the maps, islands,
                            etc)
                        </li>
                    </ul>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} color="primary" variant="contained" autoFocus>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export const HelpDialogButton = ({ buttonText = 'How to play', ...props }) => {
    const [helpOpen, setHelpOpen] = useState<boolean>(false)

    return (
        <>
            <Button
                variant="outlined"
                onClick={() => {
                    setHelpOpen(true)
                }}
                startIcon={<HelpIcon />}
                {...props}>
                {buttonText}
            </Button>
            <HelpDialog
                open={helpOpen}
                setOpen={(shouldBeOpen) => {
                    setHelpOpen(shouldBeOpen)
                }}
            />
        </>
    )
}
