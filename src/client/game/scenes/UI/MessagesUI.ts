import { Message } from '../../../../server/model/types/Message'
import { PublicPlayerState } from '../../../../server/model/GameState'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'
import { UIScene } from './UIScene'
import { BatailleGame } from '../../BatailleGame'

type UIMessage = {
    content: string
    player: PublicPlayerState | null
    displayedDuration: number
    group: Phaser.GameObjects.Group
}

const MESSAGE_DURATION = 5000 // ms
const MAX_MESSAGES_DISPLAYED = 1
const MOVE_Y = 60
const WIDTH_UI = 300
const PADDING = 16

const ENTER_KEY = 'ENTER'

export class MessagesUI {
    private messages: UIMessage[] = []
    private readonly intervalId: NodeJS.Timeout
    private enterKey

    constructor(private scene: UIScene) {
        this.onEnterPress = this.onEnterPress.bind(this)
        this.intervalId = setInterval(() => this.update(), 1000)

        this.enterKey = this.scene.input.keyboard.addKey(ENTER_KEY, true, false)
        this.enterKey.on('up', this.onEnterPress)
    }

    async onEnterPress() {
        console.log('up press')
        const promise = this.scene.getCurrentGame().onTextRequested()
        this.enterKey.removeAllListeners()
        this.enterKey.off('up', this.onEnterPress)
        BatailleGame.setInputEnable(false)
        this.scene.input.keyboard.disableGlobalCapture()

        const result = await promise

        console.log('here')
        // TODO : send result

        setTimeout(() => {
            // Prevent the onTextRequested to be called directly because this is too fast...
            this.enterKey.on('up', this.onEnterPress)
            this.scene.input.keyboard.enableGlobalCapture()
            BatailleGame.setInputEnable(true)
            console.log('enable enter')
        }, 200)
    }

    onMessageReceived(message: Message) {
        this.moveUpAll()
        if (this.messages.length > MAX_MESSAGES_DISPLAYED) {
            this.removeText(0)
        }
        const group = this.getNewText(this.scene, message)
        this.messages.push({
            ...message,
            displayedDuration: 0,
            group,
        })

        group.getChildren().forEach((child) => {
            this.scene.tweens.add({
                targets: child,
                alpha: '+= 1',
                y: `-= ${MOVE_Y}`,
                ease: 'Linear',
                duration: 400,
            })
        })
    }

    update() {
        for (const index in this.messages) {
            if (this.messages[parseInt(index)].displayedDuration >= MESSAGE_DURATION) {
                this.removeText(parseInt(index))
            } else {
                this.messages[index].displayedDuration += 1000
            }
        }
    }

    destroy() {
        clearInterval(this.intervalId)
    }

    private getNewText(scene: Phaser.Scene, message: Message): Phaser.GameObjects.Group {
        let msg = message.content
        if (message.player) {
            msg = msg.replace(message.player.name, '')
        }
        const text = scene.add.text(
            scene.sys.canvas.width / 2 - WIDTH_UI / 2,
            scene.sys.canvas.height - 200,
            msg,
            TEXT_STYLE
        )
        text.setPadding(PADDING, PADDING, PADDING, PADDING)
        text.setBackgroundColor('#000000')
        text.alpha = 0

        const groupElements = [text]
        if (message.player) {
            const textPlayer = scene.add.text(text.x + text.width - 15, text.y, message.player.name, TEXT_STYLE)
            textPlayer.setColor(`#${message.player.color.replace('0x', '')}`)
            textPlayer.setBackgroundColor('#000000')
            textPlayer.setPadding(0, PADDING, PADDING, PADDING)
            textPlayer.alpha = 0
            groupElements.push(textPlayer)
        }

        return scene.add.group(groupElements)
    }

    private removeText(index: number) {
        this.messages[index].group.getChildren().forEach((child) => {
            this.scene.tweens.add({
                targets: child,
                alpha: '-= 1',
                ease: 'Linear',
                duration: 1000,
            })
        })
        this.messages.splice(index, 1)
    }

    private moveUpAll() {
        this.messages.forEach((message) => {
            message.group.getChildren().forEach((child) => {
                const textChild = child as Phaser.GameObjects.Text
                this.scene.tweens.add({
                    targets: textChild,
                    y: {
                        from: textChild.y,
                        to: textChild.y - MOVE_Y,
                    },
                    ease: 'Linear',
                    duration: 400,
                })
            })
        })
    }
}
