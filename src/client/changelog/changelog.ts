import entries from './changelog.json'

export type ChangelogEntry = {
    version: string
    date: string
    title: string
    pr: number | null
}

const STORAGE_KEY = 'bataille.changelog.seen'

export const changelogEntries: ChangelogEntry[] = entries

export const latestVersion = (list: ChangelogEntry[]): string | null => list[0]?.version ?? null

/** Unseen as long as the stored marker is not the latest version (including no marker at all) */
export const hasUnseenChanges = (list: ChangelogEntry[], seenVersion: string | null): boolean => {
    const latest = latestVersion(list)
    return !!latest && seenVersion !== latest
}

export const readSeenVersion = (): string | null => {
    try {
        return window.localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

export const markLatestSeen = () => {
    const latest = latestVersion(changelogEntries)
    if (!latest) {
        return
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, latest)
    } catch {
        // private browsing: the badge will simply keep glowing
    }
}

export const prUrl = (pr: number): string => `https://github.com/HugoGresse/bataille/pull/${pr}`
