import 'phaser'
import {BatailleScene} from './scenes/BatailleScene'
import {UIScene} from './scenes/UIScene'
import {LoadingScene} from './scenes/LoadingScene'
import {SocketConnection} from '../SocketConnection'
import {GameActions} from './GameActions'
import {ExportType} from '../../server/model/types/ExportType'

export class BatailleGame {

    static instance: BatailleGame

    game: Phaser.Game
    socket: SocketConnection

    constructor(parent: HTMLElement) {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            backgroundColor: '#125555',
            width: 800,
            height: 800,
            scene: [LoadingScene, BatailleScene, UIScene],
            parent: parent,
            dom: {
                createContainer: false
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            // fps: {
            //     target: 1,
            //     min: 1,
            //
            // }
        };

        this.game = new Phaser.Game(config);
        this.socket = new SocketConnection("localhost:3001", (data) => {
            if(this.game.isRunning){
                this.onGameStart(data)
            }
        })
        const gameActions = new GameActions(this.socket.getSocketIO())
        this.game.registry.set("actions", gameActions)
        gameActions.joinGame()
    }

    onGameStart (data: ExportType) {
        const batailleScene: BatailleScene = this.game.scene.getScene('BatailleScene') as BatailleScene
        batailleScene.initSceneWithData(data)
    }

    destroy() {
        this.game.destroy(true)
        this.socket.disconnect()
    }

    clearGame() {
        const actions = this.game.registry.get('actions') as GameActions
        actions.clearGame()
    }

    getSocket() : SocketConnection {
        return this.socket
    }

    public static setCurrentGame(game: BatailleGame) {
        this.instance = game
    }
    public static getCurrentGame() {
        return this.instance
    }
}
