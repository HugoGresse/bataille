import fetch from 'node-fetch'

const collector = process.env.SUMOLOGIC_COLLECTOR

console.log(collector)
export const trackGameStart = (players: number) => {
    if(!collector){
        console.warn("No sumologic collector")
        return
    }
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
    if(!collector){
        return
    }
    fetch(collector, {
        method: "POST",
        body: JSON.stringify({
            gameEnded: {duration}
        })
    })
}
