import {GameObjects, Input, Scene} from 'phaser'

type Camera = Phaser.Cameras.Scene2D.Camera

export const setupCamera = (camera: Camera, scene: Scene) => {
    camera.setBounds(0, 0, 5000, 6000)
    const minZoom = 0.2
    const maxZoom = 2
    camera.zoom = 0.7
    camera.centerOn(1500, 3000)
    scene.input.on("wheel", (pointer: Input.Pointer, gameObjects: GameObjects.GameObject, deltaX: number, deltaY: number) => {
        const newZoom = deltaY > 0 ? camera.zoom - 0.1 : camera.zoom + 0.1

        if (newZoom > minZoom && newZoom < maxZoom) {
            camera.zoom = newZoom
            camera.pan(pointer.worldX, pointer.worldY, 200, "Power2")
        }

    })

    const upKey = "KeyW"
    const downKey = "KeyS"
    const leftKey = "KeyA"
    const rightKey = "KeyD"

    const movementSteps = 400

    scene.input.keyboard.on("keydown", (event: {
        code: string
    }) => {
        // TODO : use scene.input.keyboard.addKey('W') in a scene to mvoe the camera directly
        const {code} = event

        if (code === upKey) {
            camera.pan(camera.worldView.centerX, camera.worldView.centerY - movementSteps, 200, "Linear")
        }
        if (code === downKey) {
            camera.pan(camera.worldView.centerX, camera.worldView.centerY + movementSteps, 200, "Linear")
        }
        if (code === leftKey) {
            camera.pan(camera.worldView.centerX- movementSteps, camera.worldView.centerY, 200, "Linear")
        }
        if (code === rightKey) {
            camera.pan(camera.worldView.centerX + movementSteps, camera.worldView.centerY, 200, "Linear")
        }

    })

    scene.events.on('destroy', () => {
        scene.input.keyboard.off("keydown")
    })
}
