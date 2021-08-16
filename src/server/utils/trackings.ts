import fetch from 'node-fetch'

const collector = process.env.SUMOLOGIC_COLLECTOR

export const trackGameStart = (players: number) => {
    fetch(collector, {
        method: "POST",
        body: JSON.stringify({
            gameStarted: {
                players
            }
        })
    })
}

export const trackGameEnd = (duration: number) => {
    fetch(collector, {
        method: "POST",
        body: JSON.stringify({
            gameEnded: {duration}
        })
    })
}
