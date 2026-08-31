import * as Phaser from 'phaser'

export const SHADOW_TEXTURE = 'counter-shadow'
export const fillTextureKey = (radius: number) => `counter-fill-${radius}`
export const trimTextureKey = (radius: number) => `counter-trim-${radius}`

/** Baked above CSS size so counters stay crisp at maximum camera zoom on HiDPI screens */
const BAKE_SCALE = 4
const RIM_WIDTH = 2
export const TRIM_PAD = RIM_WIDTH

/**
 * The counter pieces used to be drawn as per-unit vector shapes (ellipse, arc, graphics), which
 * Phaser re-transforms and re-submits point by point every frame on the flat-triangle pipeline.
 * With a hundred stacks on the board that alone dominated the frame budget. Baked once into shared
 * textures, every unit renders as three batched quads instead.
 *
 * The fill is painted white and tinted per player; the trim (rim + bevel) keeps its own colors.
 */
export const ensureCounterTextures = (scene: Phaser.Scene, radii: number[]) => {
    if (scene.textures.exists(SHADOW_TEXTURE)) {
        return
    }
    paintShadow(scene)
    radii.forEach((radius) => {
        paintFill(scene, radius)
        paintTrim(scene, radius)
    })
}

const paintShadow = (scene: Phaser.Scene) => {
    const width = 76
    const height = 36
    const context = createTexture(scene, SHADOW_TEXTURE, width * BAKE_SCALE, height * BAKE_SCALE)
    if (!context) {
        return
    }
    context.scale(BAKE_SCALE, BAKE_SCALE)
    context.fillStyle = 'rgba(0, 0, 0, 1)'
    context.beginPath()
    context.ellipse(width / 2, height / 2, width / 2 - 1, height / 2 - 1, 0, 0, Math.PI * 2)
    context.fill()
    refresh(scene, SHADOW_TEXTURE)
}

const paintFill = (scene: Phaser.Scene, radius: number) => {
    const size = radius * 2
    const key = fillTextureKey(radius)
    const context = createTexture(scene, key, size * BAKE_SCALE, size * BAKE_SCALE)
    if (!context) {
        return
    }
    context.scale(BAKE_SCALE, BAKE_SCALE)
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(radius, radius, radius, 0, Math.PI * 2)
    context.fill()
    refresh(scene, key)
}

/** Rim stroke plus the highlight/shade pair that reads as a bevel, kept out of the tinted fill */
const paintTrim = (scene: Phaser.Scene, radius: number) => {
    const size = (radius + TRIM_PAD) * 2
    const key = trimTextureKey(radius)
    const context = createTexture(scene, key, size * BAKE_SCALE, size * BAKE_SCALE)
    if (!context) {
        return
    }
    context.scale(BAKE_SCALE, BAKE_SCALE)
    const centre = radius + TRIM_PAD
    const inner = radius - 2.4

    context.lineWidth = RIM_WIDTH
    context.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    context.beginPath()
    context.arc(centre, centre, radius, 0, Math.PI * 2)
    context.stroke()

    context.lineWidth = 2.4
    context.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    context.beginPath()
    context.arc(centre, centre, inner, toRadians(200), toRadians(340))
    context.stroke()

    context.strokeStyle = 'rgba(0, 0, 0, 0.22)'
    context.beginPath()
    context.arc(centre, centre, inner, toRadians(20), toRadians(160))
    context.stroke()

    refresh(scene, key)
}

const toRadians = (degrees: number) => degrees * Phaser.Math.DEG_TO_RAD

const refresh = (scene: Phaser.Scene, key: string) => {
    const texture = scene.textures.get(key)
    if (texture instanceof Phaser.Textures.CanvasTexture) {
        texture.refresh()
    }
}

const createTexture = (
    scene: Phaser.Scene,
    key: string,
    width: number,
    height: number
): CanvasRenderingContext2D | null => {
    const texture = scene.textures.createCanvas(key, Math.ceil(width), Math.ceil(height))
    const context = texture?.getContext()
    context?.clearRect(0, 0, Math.ceil(width), Math.ceil(height))
    return context ?? null
}
