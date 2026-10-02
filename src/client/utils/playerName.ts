import { accountNameError, normalizeAccountName } from '../../common/auth'
import { pickRandomPlayerName } from '../../utils/pickRandomPlayerName'
import { getSavedPlayerName, setPlayerNamePersistent } from './cookie'

/** One rule for guests and accounts: what an account could be named, a guest can be called */
export const isUsablePlayerName = (name: string | null | undefined): name is string =>
    !!name && name === normalizeAccountName(name) && accountNameError(name) === null

type NameStore = {
    read: () => string | null
    write: (name: string) => void
    pick: () => string
}

const browserStore: NameStore = {
    read: getSavedPlayerName,
    write: setPlayerNamePersistent,
    pick: pickRandomPlayerName,
}

const PICK_ATTEMPTS = 20
const LAST_RESORT_NAME = 'Player'

/** The list holds a few names longer than the limit: those are passed over */
export const pickUsablePlayerName = (pick: () => string = pickRandomPlayerName): string => {
    for (let attempt = 0; attempt < PICK_ATTEMPTS; attempt++) {
        const name = normalizeAccountName(pick())
        if (isUsablePlayerName(name)) {
            return name
        }
    }
    return LAST_RESORT_NAME
}

/** The only writer of the saved name. @return false when the name is not usable and was not saved */
export const savePlayerName = (name: string, store: NameStore = browserStore): boolean => {
    const normalized = normalizeAccountName(name)
    if (!isUsablePlayerName(normalized)) {
        return false
    }
    store.write(normalized)
    return true
}

/**
 * The guest's name, the same one on the home screen, in the lobby, in the game and after a
 * reload: an auto-assigned name is saved the moment it is picked, so it is picked only once.
 */
export const getOrCreatePlayerName = (store: NameStore = browserStore): string => {
    const saved = store.read()
    if (isUsablePlayerName(saved)) {
        return saved
    }
    const picked = pickUsablePlayerName(store.pick)
    store.write(picked)
    return picked
}
