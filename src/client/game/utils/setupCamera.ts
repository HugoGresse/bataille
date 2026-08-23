import * as Phaser from 'phaser'
import { GameObjects, Input, Scene } from 'phaser'
import { INPUT_ENABLE } from '../BatailleGame'
import { debounce } from '../../utils/debounce'
import { BatailleScene } from '../scenes/bataille/BatailleScene'
import { toCameraZoom, toLogicalZoom } from './renderScale'

type Camera = Phaser.Cameras.Scene2D.Camera

const DEFAULT_ZOOM = 0.7

let CURRENT_ZOOM = DEFAULT_ZOOM

/** Counters are world objects, so they need rescaling once the camera settles on a new zoom */
const rescaleCounters = (scene: BatailleScene) => scene.updateAllUnits()
const debouncedRescale = debounce(rescaleCounters, 100)

export const setupCamera = (camera: Camera, scene: BatailleScene, map: Phaser.Tilemaps.Tilemap) => {
    camera.setBounds(0, 0, 5000, 6000)
    const minZoom = 0.2
    const maxZoom = 2
    camera.zoom = toCameraZoom(CURRENT_ZOOM)
    camera.centerOn(1500, 3000)
    scene.input.on(
        'wheel',
        (pointer: Input.Pointer, gameObjects: GameObjects.GameObject, deltaX: number, deltaY: number) => {
            const current = toLogicalZoom(camera.zoom)
            CURRENT_ZOOM = deltaY > 0 ? current - 0.08 : current + 0.08

            if (CURRENT_ZOOM > minZoom && CURRENT_ZOOM < maxZoom) {
                camera.zoomTo(toCameraZoom(CURRENT_ZOOM), 100, 'Power2', true)
                debouncedRescale(scene)
            }
        }
    )

    dragMovements(camera, scene, map)
    keyMovements(camera, scene)
}

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
