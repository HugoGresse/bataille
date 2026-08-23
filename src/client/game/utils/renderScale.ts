/**
 * Phaser's RESIZE scale mode sizes the drawing buffer in CSS pixels, so on a HiDPI screen the whole
 * game is rendered at 1x and stretched by the browser, which is what makes text look soft.
 *
 * Instead the game runs in device pixels and the canvas is scaled back down with `zoom`, so the
 * buffer matches the physical screen. Everything the game measures in screen terms (HUD layout,
 * camera zoom, text) is multiplied by this factor, and the UI camera zoom undoes it so HUD code can
 * keep working in comfortable CSS pixels.
 *
 * Capped at 2: beyond that the extra pixels cost more than they show.
 */
export const RENDER_SCALE = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)

/** A length expressed in CSS pixels, in the game's internal (device pixel) space */
export const devicePx = (cssPixels: number): number => cssPixels * RENDER_SCALE

/** The camera zoom a player picked, without the device pixel factor baked in */
export const toLogicalZoom = (cameraZoom: number): number => cameraZoom / RENDER_SCALE

/** The camera zoom to apply for a zoom level the player picked */
export const toCameraZoom = (logicalZoom: number): number => logicalZoom * RENDER_SCALE
