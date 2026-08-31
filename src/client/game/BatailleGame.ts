import * as Phaser from 'phaser'
import { BatailleScene } from './scenes/bataille/BatailleScene'
import { UIScene } from './scenes/UI/UIScene'
import { LoadingScene } from './scenes/LoadingScene'
import { getSocketConnectionInstance, SocketConnection } from './SocketConnection'
import { GameActions } from './GameActions'
import { ExportTypeWithGameState } from '../../server/model/types/ExportType'
import { playStartSound } from './utils/sounds'
import { SCENE_UI_KEY } from './scenes/BaseScene'
import { TextRequestListener } from './types/TextRequestListener'
import { RENDER_SCALE } from './utils/renderScale'
import { measure, trackParentSize } from './utils/trackParentSize'

export let INPUT_ENABLE = true

export class BatailleGame {
    static instance: BatailleGame | null

    private onTextRequestListener: TextRequestListener | null = null
    private readonly game: Phaser.Game
    private readonly socket: SocketConnection
    private readonly stopResizeTracking: () => void

    constructor(parent: HTMLElement, gameId: any, onTextRequestListener: TextRequestListener) {
        console.log('New game, id: ', gameId)
        this.onTextRequestListener = onTextRequestListener
        const initialSize = measure(parent)
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            backgroundColor: '#125555',
            width: 1500,
            height: 800,
            scene: [LoadingScene, BatailleScene, UIScene],
            parent: parent,
            render: {
                // Chrome on dual-GPU laptops defaults WebGL to the integrated GPU
                powerPreference: 'high-performance',
            },
            dom: {
                createContainer: false,
            },
            scale: {
                // The drawing buffer is sized in device pixels and the canvas scaled back down, so
                // the game is rendered at the screen's real resolution instead of being stretched.
                // RESIZE cannot express that: it always sizes the buffer in CSS pixels.
                mode: Phaser.Scale.NONE,
                width: initialSize.width * RENDER_SCALE,
                height: initialSize.height * RENDER_SCALE,
                zoom: 1 / RENDER_SCALE,
            },
            fps: {
                // target: 2,
                // forceSetTimeOut: true
            },
        }

        this.game = new Phaser.Game(config)
        this.stopResizeTracking = trackParentSize(parent, (width, height) =>
            this.game.scale.resize(width * RENDER_SCALE, height * RENDER_SCALE)
        )
        const socketInstance = getSocketConnectionInstance()
        if (!socketInstance || !socketInstance.gameStartData) {
            console.log(socketInstance)
            alert('Unable to join this game, ¯\\_(ツ)_/¯')
            window.location.href = '/'
            throw Error('Pas content')
        }
        this.socket = socketInstance
        const gameActions = new GameActions(this.socket.getSocketIO())
        this.game.registry.set('actions', gameActions)
        this.onGameStart(socketInstance.gameStartData)
    }

    setFullscreen() {
        // this.game.resize()
    }

    onGameStart(data: ExportTypeWithGameState) {
        if (!this.game.isRunning) {
            setTimeout(() => {
                this.onGameStart(data)
            }, 20)
            return
        }
        const actions = this.game.registry.get('actions') as GameActions
        actions.setGameId(data.gameId)

        const batailleScene: BatailleScene = this.game.scene.getScene('BatailleScene') as BatailleScene
        const uiScene: UIScene = this.game.scene.getScene(SCENE_UI_KEY) as UIScene
        batailleScene.runOnStart(() => {
            batailleScene.initSceneWithData(data)
        })
        uiScene.runOnStart(() => {
            this.socket.setMessageListener(uiScene.onMessageReceived)
        })
        playStartSound()
    }

    destroy() {
        if (!this.game) {
            console.log('Failed to destroy')
            return
        }
        const canvas = this.game.canvas
        this.stopResizeTracking()
        this.game.destroy(true)
        // Phaser defers teardown to its next step. A game destroyed before it ever steps never gets
        // that step, so its canvas survives, stacked over the live game where it swallows every
        // click. React StrictMode mounts, unmounts and remounts in dev, which hits exactly that.
        window.setTimeout(() => canvas?.remove(), 0)
    }

    /**
     * A Scene has requested some text input from the user
     */
    async onTextRequested() {
        if (this.onTextRequestListener) {
            return this.onTextRequestListener()
        }
    }

    getSocket(): SocketConnection {
        return this.socket
    }

    public static setCurrentGame(game: BatailleGame) {
        this.instance = game
    }
    public static clearCurrentGame() {
        this.instance = null
    }
    public static getCurrentGame() {
        return this.instance
    }

    public static setInputEnable(enable: boolean) {
        INPUT_ENABLE = enable
    }
}
