import * as Phaser from 'phaser'
import { Message } from '../../../../server/model/types/Message'
import { PublicPlayerState } from '../../../../server/model/GameState'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'
import { UIScene } from './UIScene'
import { BatailleGame } from '../../BatailleGame'

type PhaserText = Phaser.GameObjects.Text

type UIMessage = {
    content: string
    player: PublicPlayerState | null
    displayedDuration: number
    group: Phaser.GameObjects.Group
    /** center = main stack above the chat area, corner = discreet bottom-right stack */
    position: 'center' | 'corner'
}

const MESSAGE_DURATION = 10000 // ms
const MAX_MESSAGES_DISPLAYED = 6
const MAX_CORNER_MESSAGES = 4
const MOVE_Y = 40
const WIDTH_UI = 300
const Y_OFFSET = 140
const CORNER_Y_OFFSET = 26
const CORNER_X_MARGIN = 14
const PADDING = 8
const ANIMATION_DURATION = 200

const ENTER_KEY = 'ENTER'
const TAKEOVER_PATTERN = / was captured by /

export class MessagesUI {
    private messages: UIMessage[] = []
    private readonly intervalId: NodeJS.Timeout
    private enterKey

    constructor(private scene: UIScene) {
        this.onEnterPress = this.onEnterPress.bind(this)
        this.intervalId = setInterval(() => this.update(), 1000)

        this.enterKey = this.scene.input.keyboard!.addKey(ENTER_KEY, true, false)
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
        this.scene.input.keyboard!.disableGlobalCapture()

        const result = await promise

        if (result) {
            // @ts-ignore
            this.scene.sendMessage((result as string).trim())
        }

        setTimeout(() => {
            // Prevent the onTextRequested to be called directly because this is too fast...
            this.enterKey.on('up', this.onEnterPress)
            this.scene.input.keyboard!.enableGlobalCapture()
            BatailleGame.setInputEnable(true)
        }, 200)
    }

    onMessageReceived(message: Message) {
        const position = this.getMessagePosition(message)
        // Make room on the target stack for the incoming message
        this.moveUpAll(position)

        const group = this.getNewText(this.scene, message, position)
        const uiMessage: UIMessage = {
            ...message,
            displayedDuration: 0,
            group,
            position,
        }
        this.messages.push(uiMessage)

        group.getChildren().forEach((child) => {
            this.scene.tweens.add({
                targets: child,
                alpha: '+= 1',
                y: `-= ${MOVE_Y}`,
                ease: 'Linear',
                duration: ANIMATION_DURATION,
            })
        })
    }

    /**
     * Takeover notices involving the current player stay in the center stack,
     * all other takeover notices are demoted to the discreet bottom-right corner stack.
     */
    private getMessagePosition(message: Message): 'center' | 'corner' {
        if (!TAKEOVER_PATTERN.test(message.content)) {
            return 'center'
        }
        const myName = this.scene.getState()?.cp.n
        if (!myName) {
            return 'corner'
        }
        const involvesMe = message.player?.n === myName || message.content.includes(myName)
        return involvesMe ? 'center' : 'corner'
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
                return [message.player.n + ': ', message.content]
            } else {
                return [message.content.replace(message.player.n, ''), message.player.n]
            }
        }
        return [message.content]
    }

    private getNewText(scene: Phaser.Scene, message: Message, position: 'center' | 'corner'): Phaser.GameObjects.Group {
        const textContents = this.getTextMessage(message)
        const isCorner = position === 'corner'
        const baseY = isCorner ? scene.sys.canvas.height - CORNER_Y_OFFSET : scene.sys.canvas.height - Y_OFFSET
        const baseX = isCorner
            ? scene.sys.canvas.width - CORNER_X_MARGIN
            : scene.sys.canvas.width / 2 - WIDTH_UI / 2

        const text = scene.add.text(baseX, baseY, textContents[0], TEXT_STYLE)
        text.setPadding(PADDING, PADDING, PADDING, PADDING)
        text.setBackgroundColor('#000000')
        text.alpha = 0

        const groupElements = [text]
        let secondTextObject: PhaserText | null = null
        if (message.player) {
            secondTextObject = scene.add.text(text.x + text.width - 8, text.y, textContents[1], TEXT_STYLE)
            secondTextObject.setBackgroundColor('#000000')
            secondTextObject.setPadding(0, PADDING, PADDING, PADDING)
            secondTextObject.setWordWrapWidth(scene.sys.canvas.width / 3)
            secondTextObject.alpha = 0
            text.setFixedSize(text.width, secondTextObject.displayHeight)
            groupElements.push(secondTextObject)
        }

        if (isCorner) {
            // Right align the whole group against the screen edge
            const totalWidth = text.width + (secondTextObject ? secondTextObject.width - 8 : 0)
            const shift = baseX - (scene.sys.canvas.width - CORNER_X_MARGIN) - totalWidth
            text.x += shift
            secondTextObject?.setX(secondTextObject.x + shift)
        }

        if (message.player) {
            if (message.isUserMessage) {
                text.setColor(`#${message.player.c.replace('0x', '')}`)
            } else {
                secondTextObject?.setColor(`#${message.player.c.replace('0x', '')}`)
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
                duration: ANIMATION_DURATION,
            })
        })
        this.messages.splice(index, 1)
    }

    private moveUpAll(position: 'center' | 'corner') {
        const yOffset = position === 'corner' ? CORNER_Y_OFFSET : Y_OFFSET
        const maxDisplayed = position === 'corner' ? MAX_CORNER_MESSAGES : MAX_MESSAGES_DISPLAYED
        const canvasHeight = this.scene.sys.canvas.height

        const stack = this.messages.filter((m) => m.position === position)
        if (stack.length >= maxDisplayed) {
            const oldest = stack[0]
            this.removeText(this.messages.indexOf(oldest))
            stack.shift()
        }

        for (let i = 0; i < stack.length; i++) {
            const iReverse = stack.length - i
            stack[i].group.getChildren().forEach((child) => {
                const textChild = child as PhaserText
                this.scene.tweens.add({
                    targets: textChild,
                    y: {
                        from: canvasHeight - yOffset - iReverse * MOVE_Y,
                        to: canvasHeight - yOffset - iReverse * MOVE_Y - MOVE_Y,
                    },
                    ease: 'Linear',
                    duration: ANIMATION_DURATION,
                })
            })
        }
    }
}
