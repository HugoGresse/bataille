import {GameObjects, Input, Scene} from 'phaser'
type Camera = Phaser.Cameras.Scene2D.Camera

export const setupCamera = (camera: Camera, scene: Scene) => {
    camera.setBounds(0, 0, 3000, 6000)
    const minZoom = 0.1
    const maxZoom = 2
    camera.zoom = 0.7
    camera.centerOn(1500, 3000)
    scene.input.on("wheel",  (pointer: Input.Pointer, gameObjects: GameObjects.GameObject, deltaX: number, deltaY: number) => {
        const newZoom = deltaY > 0 ? camera.zoom - 0.1 : camera.zoom + 0.1

        if(newZoom > minZoom && newZoom < maxZoom) {
                camera.zoom = newZoom;
            camera.pan(pointer.worldX, pointer.worldY, 200, "Power2");
        }

    });
}
