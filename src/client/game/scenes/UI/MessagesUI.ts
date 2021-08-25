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

const MESSAGE_DURATION = 10000 // ms
const MAX_MESSAGES_DISPLAYED = 6
const MOVE_Y = 40
const WIDTH_UI = 300
const PADDING = 8

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
        const game = this.scene.getCurrentGame()
        if (!game) {
            console.warn('No current game')
            return
        }
        const promise = game.onTextRequested()
        this.enterKey.removeAllListeners()
        this.enterKey.off('up', this.onEnterPress)
        BatailleGame.setInputEnable(false)
        this.scene.input.keyboard.disableGlobalCapture()

        const result = await promise

        if (result) {
            // @ts-ignore
            this.scene.sendMessage((result as string).trim())
        }

        setTimeout(() => {
            // Prevent the onTextRequested to be called directly because this is too fast...
            this.enterKey.on('up', this.onEnterPress)
            this.scene.input.keyboard.enableGlobalCapture()
            BatailleGame.setInputEnable(true)
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

    private getTextMessage(message: Message): string[] {
        if (message.player) {
            if (message.isUserMessage) {
                return [message.player.name + ': ', message.content]
            } else {
                return [message.content.replace(message.player.name, ''), message.player.name]
            }
        }
        return [message.content]
    }

    private getNewText(scene: Phaser.Scene, message: Message): Phaser.GameObjects.Group {
        const textContents = this.getTextMessage(message)
        const text = scene.add.text(
            scene.sys.canvas.width / 2 - WIDTH_UI / 2,
            scene.sys.canvas.height - 200,
            textContents[0],
            TEXT_STYLE
        )
        text.setPadding(PADDING, PADDING, PADDING, PADDING)
        text.setBackgroundColor('#000000')
        text.alpha = 0

        const groupElements = [text]
        if (message.player) {
            const secondTextObject = scene.add.text(text.x + text.width - 8, text.y, textContents[1], TEXT_STYLE)
            secondTextObject.setBackgroundColor('#000000')
            secondTextObject.setPadding(0, PADDING, PADDING, PADDING)
            secondTextObject.setWordWrapWidth(scene.sys.canvas.width / 3)
            secondTextObject.alpha = 0
            text.setFixedSize(text.width, secondTextObject.displayHeight)
            groupElements.push(secondTextObject)
        }

        if (message.player) {
            if (message.isUserMessage) {
                text.setColor(`#${message.player.color.replace('0x', '')}`)
            } else {
                groupElements[1].setColor(`#${message.player.color.replace('0x', '')}`)
            }
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
