import React, { useSyncExternalStore } from 'react'
import { Chip, keyframes } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { changelogEntries, hasUnseenChanges, latestVersion, readSeenVersion } from '../changelog/changelog'

const pulse = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0.55); }
    70% { box-shadow: 0 0 0 9px rgba(255, 87, 34, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0); }
`

/** A short wag with a long rest: moves enough to catch the eye without nagging */
const wiggle = keyframes`
    0%, 86%, 100% { transform: rotate(0deg) scale(1); }
    88% { transform: rotate(-4deg) scale(1.06); }
    90% { transform: rotate(4deg) scale(1.08); }
    92% { transform: rotate(-3deg) scale(1.06); }
    94% { transform: rotate(2deg) scale(1.04); }
    96% { transform: rotate(0deg) scale(1); }
`

const seenListeners = new Set<() => void>()
export const notifySeenChanged = () => seenListeners.forEach((listener) => listener())
const subscribeSeen = (listener: () => void) => {
    seenListeners.add(listener)
    return () => {
        seenListeners.delete(listener)
    }
}

/**
 * The app version, wearing the "something changed since your last visit" glow. Clicking it opens
 * the changelog, which clears the glow for this version.
 */
export const VersionBadge = () => {
    const navigate = useNavigate()
    const seenVersion = useSyncExternalStore(subscribeSeen, readSeenVersion)
    const unseen = hasUnseenChanges(changelogEntries, seenVersion)

    return (
        <Chip
            label={`v${latestVersion(changelogEntries)} — what's new${unseen ? ' •' : ''}`}
            size="small"
            variant="outlined"
            color={unseen ? 'secondary' : 'default'}
            onClick={() => navigate('/changelog')}
            sx={
                unseen ? { animation: `${pulse} 2s ease-out infinite, ${wiggle} 3.5s ease-in-out infinite` } : undefined
            }
        />
    )
}
