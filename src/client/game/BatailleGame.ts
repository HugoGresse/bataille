import 'phaser'
import { BatailleScene } from './scenes/bataille/BatailleScene'
import { UIScene } from './scenes/UI/UIScene'
import { LoadingScene } from './scenes/LoadingScene'
import { getSocketConnectionInstance, SocketConnection } from './SocketConnection'
import { GameActions } from './GameActions'
import { ExportTypeWithGameState } from '../../server/model/types/ExportType'
import { playStartSound } from './utils/sounds'
import { SCENE_UI_KEY } from './scenes/BaseScene'
import { TextRequestListener } from './types/TextRequestListener'

export let INPUT_ENABLE = true

export class BatailleGame {
    static instance: BatailleGame | null

    private onTextRequestListener: TextRequestListener | null = null
    private readonly game: Phaser.Game
    private readonly socket: SocketConnection

    constructor(parent: HTMLElement, gameId: any, onTextRequestListener: TextRequestListener) {
        console.log('New game, id: ', gameId)
        this.onTextRequestListener = onTextRequestListener
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            backgroundColor: '#125555',
            width: 1500,
            height: 800,
            scene: [LoadingScene, BatailleScene, UIScene],
            parent: parent,
            dom: {
                createContainer: false,
            },
            scale: {
                mode: Phaser.Scale.RESIZE,
                width: '100%',
                height: '100%',
            },
            fps: {
                // target: 2,
                // forceSetTimeOut: true
            },
        }

        this.game = new Phaser.Game(config)
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
        if (this.game) {
            this.game.destroy(true)
            this.socket.disconnect()
        } else {
            console.log('Failed to destroy')
        }
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
