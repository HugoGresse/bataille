/**
 * UI scenes (UIScene) sit above the game scene (BatailleScene) but Phaser dispatches raw pointer
 * events to every scene. Widgets marked with `markUIPointer` prevent the game scene from treating
 * the matching pointer up as a tile selection / move destination.
 */
let uiPointerFlag = false

export const markUIPointer = () => {
    uiPointerFlag = true
}

/** Returns true once if a pointer interaction on an UI widget happened since last call. */
export const consumeUIPointer = (): boolean => {
    const value = uiPointerFlag
    uiPointerFlag = false
    return value
}

/** Standard listener to plug on interactive UI objects. */
export const onUIDown = () => {
    markUIPointer()
}
