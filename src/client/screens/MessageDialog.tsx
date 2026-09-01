import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, Dialog, DialogContent, TextField, Typography } from '@mui/material'
import { chatOnly, clockTime, ReceivedMessage } from '../game/chat/chatLog'
import { toCssColor } from '../game/utils/colors'

type MessageDialogProps = {
    open: boolean
    messages: ReceivedMessage[]
    onSubmit: (content: string | null) => void
}

export const MessageDialog = ({ open, messages, onSubmit }: MessageDialogProps) => {
    const [content, setContent] = useState<string>('')
    const bottom = useRef<HTMLDivElement>(null)
    const chat = chatOnly(messages)

    // The newest line is the one you came for, whether the window just opened or a line just landed
    useEffect(() => {
        if (open) {
            bottom.current?.scrollIntoView()
        }
    }, [open, chat.length])

    return (
        <Dialog
            open={open}
            onClose={() => onSubmit(null)}
            fullWidth={true}
            maxWidth={'md'}
            container={() => document.getElementById('gameTopContainer')}
            aria-labelledby="chat-dialog-title"
            aria-describedby="chat-dialog-description">
            <DialogContent>
                <Typography id="chat-dialog-title" variant="overline" sx={{ opacity: 0.6 }}>
                    Chat
                </Typography>
                <Box
                    sx={{
                        height: 240,
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 1,
                        padding: 1,
                        marginBottom: 2,
                    }}>
                    {chat.length === 0 ? (
                        <Typography variant="body2" sx={{ opacity: 0.5 }}>
                            No messages yet. Say something to the other players.
                        </Typography>
                    ) : (
                        chat.map((message, index) => (
                            <Box key={`${message.at}-${index}`} sx={{ display: 'flex', gap: 1, marginBottom: 0.5 }}>
                                <Typography variant="caption" sx={{ opacity: 0.45, flexShrink: 0 }}>
                                    {clockTime(message.at)}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: toCssColor(message.player?.c), fontWeight: 'bold', flexShrink: 0 }}>
                                    {message.player?.n ?? '?'}
                                </Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                    {message.content}
                                </Typography>
                            </Box>
                        ))
                    )}
                    <div ref={bottom} />
                </Box>
                <TextField
                    autoFocus
                    fullWidth={true}
                    placeholder="Some message to all players (enter to submit)"
                    value={content}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            onSubmit(content)
                            setContent('')
                        }
                    }}
                />
                <br />
                <br />
                <Button onClick={() => onSubmit(null)} color="primary" variant="contained">
                    Cancel
                </Button>
            </DialogContent>
        </Dialog>
    )
}
