import {GameObjects, Input, Scene} from 'phaser'
type Camera = Phaser.Cameras.Scene2D.Camera

export const setupCamera = (camera: Camera, scene: Scene) => {
    camera.setBounds(0, 0, 1100, 1100)
    const minZoom = 0.3
    const maxZoom = 2
    scene.input.keyboard.addKey('Q').on('up', (event: KeyboardEvent) => {
        camera.setZoom(camera.zoomX - 0.1, camera.zoomY - 0.1)
    })
    scene.input.keyboard.addKey('S').on('up', (event: KeyboardEvent) => {
        camera.setZoom(camera.zoomX + 0.1, camera.zoomY + 0.1)
    })

    scene.input.on("wheel",  (pointer: Input.Pointer, gameObjects: GameObjects.GameObject, deltaX: number, deltaY: number) => {
        const newZoom = deltaY > 0 ? camera.zoom - 0.1 : camera.zoom + 0.1

        if(newZoom > minZoom && newZoom < maxZoom) {
            if (deltaY > 0) {
                camera.zoom = newZoom;
            }

            if (deltaY < 0) {
                camera.zoom = newZoom;
            }
            console.log(newZoom)
            camera.pan(pointer.worldX, pointer.worldY, 200, "Power2");
        }

    });
}
