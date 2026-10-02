import { ACCOUNT_NAME_MAX, ACCOUNT_NAME_MIN } from '../../common/auth'
import { pickRandomPlayerName } from '../../utils/pickRandomPlayerName'
import { getSavedPlayerName, setPlayerNamePersistent } from './cookie'

export const isUsablePlayerName = (name: string | null | undefined): name is string =>
    !!name && name.length >= ACCOUNT_NAME_MIN && name.length <= ACCOUNT_NAME_MAX

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

/**
 * The guest's name, the same one on the home screen, in the lobby, in the game and after a
 * reload: an auto-assigned name is saved the moment it is picked, so it is picked only once.
 */
export const getOrCreatePlayerName = (store: NameStore = browserStore): string => {
    const saved = store.read()
    if (isUsablePlayerName(saved)) {
        return saved
    }
    const picked = store.pick()
    store.write(picked)
    return picked
}
