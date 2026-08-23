import * as Phaser from 'phaser'
import { RENDER_SCALE } from '../../utils/renderScale'

export const PLATE_TEXTURE = 'city-ring-plate'
export const SAT_TEXTURE = 'city-ring-sat'
export const SAT_OFF_TEXTURE = 'city-ring-sat-off'

const PLATE_INK = '8, 13, 24'

/**
 * The ring backdrop and satellite faces are painted once into canvas textures: Phaser shapes cannot
 * hold a gradient, and a thick ring stroke draws as overlapping quads that blend into visible spokes.
 * Textures are generated at the device pixel ratio and displayed at their CSS size, so they stay
 * crisp on HiDPI screens.
 */
export const ensureRingTextures = (scene: Phaser.Scene, plateRadius: number, satRadius: number) => {
    paintPlate(scene, plateRadius)
    paintSatellite(scene, SAT_TEXTURE, satRadius, ['#8a5ce8', '#6a3fc4'], 0.34)
    paintSatellite(scene, SAT_OFF_TEXTURE, satRadius, ['#333c52', '#262e40'], 0.14)
}

/**
 * Clear over the middle so the selected counter underneath is never dimmed, then a soft vignette
 * hugging the city that fades out before its edge shows.
 */
const paintPlate = (scene: Phaser.Scene, radius: number) => {
    const size = Math.ceil(radius * 2 * RENDER_SCALE)
    const context = createTexture(scene, PLATE_TEXTURE, size)
    if (!context) {
        return
    }
    const centre = size / 2
    const gradient = context.createRadialGradient(centre, centre, 0, centre, centre, centre)
    gradient.addColorStop(0, `rgba(${PLATE_INK}, 0)`)
    gradient.addColorStop(0.36, `rgba(${PLATE_INK}, 0)`)
    gradient.addColorStop(0.52, `rgba(${PLATE_INK}, 0.62)`)
    gradient.addColorStop(0.78, `rgba(${PLATE_INK}, 0.5)`)
    gradient.addColorStop(1, `rgba(${PLATE_INK}, 0)`)
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    refresh(scene, PLATE_TEXTURE)
}

/** A coin: vertical gradient face, hairline rim, highlight along the top, shade along the bottom */
const paintSatellite = (
    scene: Phaser.Scene,
    key: string,
    radius: number,
    [top, bottom]: [string, string],
    rimAlpha: number
) => {
    const pad = 3
    const size = Math.ceil((radius + pad) * 2 * RENDER_SCALE)
    const context = createTexture(scene, key, size)
    if (!context) {
        return
    }
    context.scale(RENDER_SCALE, RENDER_SCALE)
    const centre = radius + pad

    context.beginPath()
    context.arc(centre, centre, radius, 0, Math.PI * 2)
    const face = context.createLinearGradient(0, centre - radius, 0, centre + radius)
    face.addColorStop(0, top)
    face.addColorStop(1, bottom)
    context.fillStyle = face
    context.fill()

    context.save()
    context.clip()
    context.lineWidth = 3
    context.strokeStyle = `rgba(255, 255, 255, ${rimAlpha * 0.9})`
    context.beginPath()
    context.arc(centre, centre - 1.5, radius - 1, Math.PI * 1.15, Math.PI * 1.85)
    context.stroke()
    context.strokeStyle = `rgba(0, 0, 0, 0.3)`
    context.beginPath()
    context.arc(centre, centre + 1.5, radius - 1, Math.PI * 0.15, Math.PI * 0.85)
    context.stroke()
    context.restore()

    context.lineWidth = 1
    context.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`
    context.beginPath()
    context.arc(centre, centre, radius - 0.5, 0, Math.PI * 2)
    context.stroke()

    refresh(scene, key)
}

/** Push the canvas bytes to the GPU after painting */
const refresh = (scene: Phaser.Scene, key: string) => {
    const texture = scene.textures.get(key)
    if (texture instanceof Phaser.Textures.CanvasTexture) {
        texture.refresh()
    }
}

const createTexture = (scene: Phaser.Scene, key: string, size: number): CanvasRenderingContext2D | null => {
    if (scene.textures.exists(key)) {
        scene.textures.remove(key)
    }
    const texture = scene.textures.createCanvas(key, size, size)
    const context = texture?.getContext()
    if (context) {
        context.clearRect(0, 0, size, size)
    }
    return context ?? null
}
