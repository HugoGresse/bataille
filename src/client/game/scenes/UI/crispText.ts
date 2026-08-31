import * as Phaser from 'phaser'
import { RENDER_SCALE } from '../../utils/renderScale'

/**
 * Phaser rasterises text into a texture at its nominal size. The cameras magnify by the device
 * pixel ratio so the game fills a HiDPI buffer, which would resample that texture and make every
 * label look soft, so text is rendered at the same ratio and lands pixel for pixel.
 */
export const crispText = (
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
): Phaser.GameObjects.Text => {
    const label = scene.add.text(x, y, text, { ...style, resolution: RENDER_SCALE })
    // Half pixels are the other half of the blur: a label pinned to a fractional position is
    // resampled no matter how sharp its texture is.
    label.setPosition(Math.round(x), Math.round(y))
    return label
}

/**
 * Text#setColor re-rasterises the label and re-uploads its texture even when the color has not
 * changed, so any per-frame caller must go through this guard.
 */
export const setColorIfChanged = (label: Phaser.GameObjects.Text, color: string) => {
    if (label.style.color !== color) {
        label.setColor(color)
    }
}
