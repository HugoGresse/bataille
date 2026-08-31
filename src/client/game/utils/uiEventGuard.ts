import * as Phaser from 'phaser'

/**
 * UI scenes (UIScene) sit above the game scene (BatailleScene) but Phaser dispatches raw pointer
 * events to every scene. Widgets marked with `markUIPointer` prevent the game scene from treating
 * the matching pointer up as a tile selection / move destination.
 *
 * The mark names the gesture that set it rather than being a plain flag. Phaser's `globalTopOnly`
 * stops dispatching to the scenes below as soon as the UI scene captures a pointer, so the game
 * scene never sees the press that was marked and gets no chance to clear a flag: it would then
 * swallow the *next* click on the map instead, which is the click after every muster.
 */
let guardedDownTime = -1

export const markUIPointer = (pointer: Phaser.Input.Pointer) => {
    guardedDownTime = pointer.downTime
}

/** True when this pointer gesture started on a UI widget, so the map must ignore it. */
export const consumeUIPointer = (pointer: Phaser.Input.Pointer): boolean => guardedDownTime === pointer.downTime
