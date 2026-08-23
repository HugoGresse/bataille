import * as Phaser from 'phaser'
import { RENDER_SCALE } from '../game/utils/renderScale'

/**
 * The canvas is sized in device pixels so the game renders at the screen's real resolution. HUD
 * layout stays in CSS pixels, which is what the UI camera zoom maps back onto those device pixels.
 */
export const getGameWindowSize = (scene: Phaser.Scene): { width: number; height: number } => ({
    width: scene.sys.game.canvas.width / RENDER_SCALE,
    height: scene.sys.game.canvas.height / RENDER_SCALE,
})
