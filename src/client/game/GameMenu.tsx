import React, { useState } from 'react'
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import BackIcon from '@mui/icons-material/ArrowBack'
import FeedbackIcon from '@mui/icons-material/Feedback'
import FlagIcon from '@mui/icons-material/Flag'
import HelpIcon from '@mui/icons-material/Help'
import { HelpDialog } from '../screens/HelpDialog'

type GameMenuProps = {
    exitLabel: string
    onExit: () => void
    /** Null for a spectator, who has nothing to surrender */
    onSurrender: (() => void) | null
    surrendered: boolean
    onFullscreen: () => void
    /** Where the menu and dialogs mount, so they still show once the game is fullscreen */
    container: () => HTMLElement | null
}

/**
 * On a phone the toolbar wrapped onto three rows and took a sixth of the screen from the map. The
 * same actions fold into one button floating over the map's top-right corner instead.
 */
export const GameMenu = ({ exitLabel, onExit, onSurrender, surrendered, onFullscreen, container }: GameMenuProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const [helpOpen, setHelpOpen] = useState(false)
    const close = () => setAnchor(null)
    const run = (action: () => void) => () => {
        close()
        action()
    }

    return (
        <>
            <IconButton
                aria-label="Game menu"
                onClick={(event) => setAnchor(event.currentTarget)}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    color: '#fff',
                    bgcolor: 'rgba(6, 10, 18, 0.74)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    '&:hover': { bgcolor: 'rgba(6, 10, 18, 0.9)' },
                }}>
                <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchor} open={!!anchor} onClose={close} container={container}>
                <MenuItem onClick={run(() => setHelpOpen(true))}>
                    <ListItemIcon>
                        <HelpIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Help</ListItemText>
                </MenuItem>
                <MenuItem component="a" href="https://discord.gg/tQP5TVD9js" target="_blank" onClick={close}>
                    <ListItemIcon>
                        <FeedbackIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Discord (feedbacks/news)</ListItemText>
                </MenuItem>
                <MenuItem onClick={run(onFullscreen)}>
                    <ListItemIcon>
                        <FullscreenIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Fullscreen</ListItemText>
                </MenuItem>
                {onSurrender && (
                    <MenuItem disabled={surrendered} onClick={run(onSurrender)}>
                        <ListItemIcon>
                            <FlagIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{surrendered ? 'Surrendered' : 'Surrender'}</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={run(onExit)}>
                    <ListItemIcon>
                        <BackIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{exitLabel}</ListItemText>
                </MenuItem>
            </Menu>
            <HelpDialog open={helpOpen} setOpen={setHelpOpen} />
        </>
    )
}
