const COOKIE_PLAYER_NAME = 'bataillePlayerName'

export const setPlayerNamePersistent = (value: string) => {
    const days = 99999
    const name = COOKIE_PLAYER_NAME
    let expires = ''
    if (days) {
        const date = new Date()
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
        expires = '; expires=' + date.toUTCString()
    }
    document.cookie = name + '=' + encodeURIComponent(value || '') + expires + '; path=/'
}
export const getSavedPlayerName = () => {
    const nameEQ = COOKIE_PLAYER_NAME + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') c = c.substring(1, c.length)
        if (c.indexOf(nameEQ) === 0) {
            const raw = c.substring(nameEQ.length, c.length)
            try {
                return decodeURIComponent(raw)
            } catch {
                return raw // written before values were encoded
            }
        }
    }
    return null
}
