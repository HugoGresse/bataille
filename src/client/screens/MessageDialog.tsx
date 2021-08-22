import React, { useState } from 'react'
import { Button, Dialog, DialogContent, TextField } from '@material-ui/core'

type MessageDialogProps = {
    open: boolean
    onSubmit: (content: string | null) => void
}

export const MessageDialog = ({ open, onSubmit }: MessageDialogProps) => {
    const [content, setContent] = useState<string>('')
    return (
        <Dialog
            open={open}
            onClose={() => onSubmit(null)}
            fullWidth={true}
            maxWidth={'md'}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth={true}
                    placeholder="Some message to all players (enter to submit)"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyPress={(event) => {
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
