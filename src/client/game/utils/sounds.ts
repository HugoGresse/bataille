export const playStartSound = () => {
    const audio = new Audio('/assets/audio/poupoupoupou.mp3')
    audio.volume = 0.7;
        audio.play()
}

export const playTownCapturedSound = () => {
    const audio = new Audio('/assets/audio/pipou.mp3')
    audio.volume = 0.5;
    audio.play()
}
