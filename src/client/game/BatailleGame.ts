import 'phaser'
import {BatailleScene} from './scenes/bataille/BatailleScene'
import {UIScene} from './scenes/UI/UIScene'
import {LoadingScene} from './scenes/LoadingScene'
import {getSocketConnectionInstance, SocketConnection} from '../SocketConnection'
import {GameActions} from './GameActions'
import {ExportType} from '../../server/model/types/ExportType'

export class BatailleGame {

    static instance: BatailleGame

    game: Phaser.Game
    socket: SocketConnection

    constructor(parent: HTMLElement, gameId: any) {
        console.log("New game, id: ", gameId)
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            backgroundColor: '#125555',
            width: 1500,
            height: 800,
            scene: [LoadingScene, BatailleScene, UIScene],
            parent: parent,
            dom: {
                createContainer: false
            },
            fps: {
                // target: 2,
                // forceSetTimeOut: true
            }
        };

        this.game = new Phaser.Game(config);
        const socketInstance = getSocketConnectionInstance()
        if(!socketInstance || !socketInstance.gameStartData) {
            console.log(socketInstance)
            alert('Unable to join this game, ¯\\_(ツ)_/¯')
            throw Error('Unable to join this game, ¯\\_(ツ)_/¯')
        }
        this.socket = socketInstance
        const gameActions = new GameActions(this.socket.getSocketIO())
        this.game.registry.set("actions", gameActions)
        this.onGameStart(socketInstance.gameStartData)
    }

    start () {
        const actions = this.game.registry.get('actions') as GameActions
        actions.forceGameStart()
    }

    onGameStart (data: ExportType) {
        if(!this.game.isRunning) {
            setTimeout(() => {
                this.onGameStart(data)
            }, 20)
            return
        }
        const actions = this.game.registry.get('actions') as GameActions
        actions.setGameId(data.gameId)

        const batailleScene: BatailleScene = this.game.scene.getScene('BatailleScene') as BatailleScene

        if(batailleScene.scene.settings.active && batailleScene.scene.settings.visible) {
            batailleScene.initSceneWithData(data)
        } else {
            batailleScene.events.on('start', function(){
                batailleScene.initSceneWithData(data)
                batailleScene.events.off('start')
            });
            batailleScene.events.on('destroy', () => {
                batailleScene.events.off('start')
            });
        }
    }

    destroy() {
        if(this.game) {
            this.game.destroy(true)
            this.socket.disconnect()
        }
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
