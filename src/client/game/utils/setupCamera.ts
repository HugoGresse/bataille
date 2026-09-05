import * as Phaser from 'phaser'
import { GameObjects, Input, Scene } from 'phaser'
import { INPUT_ENABLE } from '../BatailleGame'
import { debounce } from '../../utils/debounce'
import { BatailleScene } from '../scenes/bataille/BatailleScene'
import { toCameraZoom, toLogicalZoom } from './renderScale'
import { clampZoom, distanceBetween, pinchedZoom, WHEEL_ZOOM_STEP } from './pinchZoom'

type Camera = Phaser.Cameras.Scene2D.Camera

const DEFAULT_ZOOM = 0.7

let CURRENT_ZOOM = DEFAULT_ZOOM

/** Counters are world objects, so they need rescaling once the camera settles on a new zoom */
const rescaleCounters = (scene: BatailleScene) => scene.updateAllUnits()
const debouncedRescale = debounce(rescaleCounters, 100)

export const setupCamera = (camera: Camera, scene: BatailleScene, map: Phaser.Tilemaps.Tilemap) => {
    camera.setBounds(0, 0, 5000, 6000)
    camera.zoom = toCameraZoom(CURRENT_ZOOM)
    camera.centerOn(1500, 3000)
    scene.input.on(
        'wheel',
        (pointer: Input.Pointer, gameObjects: GameObjects.GameObject, deltaX: number, deltaY: number) => {
            const step = deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP
            CURRENT_ZOOM = clampZoom(toLogicalZoom(camera.zoom) + step)
            camera.zoomTo(toCameraZoom(CURRENT_ZOOM), 100, 'Power2', true)
            debouncedRescale(scene)
        }
    )

    pinchMovements(camera, scene)
    dragMovements(camera, scene, map)
    keyMovements(camera, scene)
}

/**
 * Two fingers on the map zoom it by the ratio of their spread, following them frame by frame rather
 * than easing, since an easing lags behind the hand. The second pointer has to be asked for: Phaser
 * tracks a single touch until told otherwise.
 */
const pinchMovements = (camera: Camera, scene: BatailleScene) => {
    scene.input.addPointer(1)
    let previousDistance: number | null = null

    scene.input.on('pointermove', () => {
        const { pointer1, pointer2 } = scene.input
        if (!pointer1.isDown || !pointer2?.isDown) {
            previousDistance = null
            return
        }
        const distance = distanceBetween(pointer1, pointer2)
        if (previousDistance !== null) {
            CURRENT_ZOOM = pinchedZoom(toLogicalZoom(camera.zoom), previousDistance, distance)
            camera.setZoom(toCameraZoom(CURRENT_ZOOM))
            debouncedRescale(scene)
        }
        previousDistance = distance
    })
    scene.input.on('pointerup', () => {
        previousDistance = null
    })
}

const isPinching = (scene: Scene): boolean => !!scene.input.pointer2?.isDown

const dragMovements = (camera: Camera, scene: Scene, map: Phaser.Tilemaps.Tilemap) => {
    const zone = scene.add
        .zone(map.widthInPixels / 2, map.heightInPixels / 2, map.widthInPixels, map.heightInPixels)
        .setInteractive({ draggable: true })
        .setDepth(2)

    let dX = 0
    let dY = 0
    zone.on('dragstart', (pointer: PointerEvent, dragX: number, dragY: number) => {
        // @ts-ignore
        dX = pointer.worldX
        // @ts-ignore
        dY = pointer.worldY
    })
    zone.on('drag', (pointer: PointerEvent, dragX: number, dragY: number) => {
        // A second finger means a pinch: the first one is spreading, not panning
        if (isPinching(scene)) {
            return
        }
        if (dX === 0 && dY === 0) {
            // @ts-ignore
            dX = pointer.worldX
            // @ts-ignore
            dY = pointer.worldY
        }
        // @ts-ignore
        const worldX = pointer.worldX
        // @ts-ignore
        const worldY = pointer.worldY
        let x = 0
        let y = 0
        if (worldX > dX) {
            x = -(worldX - dX)
        } else {
            x = dX - worldX
        }
        if (worldY > dY) {
            y = -(worldY - dY)
        } else {
            y = dY - worldY
        }
        camera.pan(camera.worldView.centerX + x, camera.worldView.centerY + y, 100, 'Linear')
    })
    zone.on('dragend', () => {
        dX = 0
        dY = 0
    })
    scene.events.on('destroy', () => {
        scene.input.keyboard?.off('drag')
    })
}

const keyMovements = (camera: Camera, scene: Scene) => {
    const upKey = 'KeyW'
    const downKey = 'KeyS'
    const leftKey = 'KeyA'
    const rightKey = 'KeyD'

    const movementSteps = 400

    scene.input.keyboard?.on('keydown', (event: { code: string }) => {
        if (!INPUT_ENABLE) {
            return
        }
        // TODO : use scene.input.keyboard.addKey('W') in a scene to mvoe the camera directly
        const { code } = event

        if (code === upKey) {
            camera.pan(camera.worldView.centerX, camera.worldView.centerY - movementSteps, 200, 'Linear')
        }
        if (code === downKey) {
            camera.pan(camera.worldView.centerX, camera.worldView.centerY + movementSteps, 200, 'Linear')
        }
        if (code === leftKey) {
            camera.pan(camera.worldView.centerX - movementSteps, camera.worldView.centerY, 200, 'Linear')
        }
        if (code === rightKey) {
            camera.pan(camera.worldView.centerX + movementSteps, camera.worldView.centerY, 200, 'Linear')
        }
    })

    scene.events.on('destroy', () => {
        scene.input.keyboard?.off('keydown')
    })
}
