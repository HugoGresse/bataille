import { Physics, GameObjects } from "phaser";

export class Actor extends Physics.Arcade.Sprite {
    protected hp = 100;
    protected selectedCircle !: GameObjects.Arc | null

    constructor(scene: Phaser.Scene, public readonly id: string, x: number, y: number, texture: string, frame?: string | number) {
        super(scene, x, y, texture, frame);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.getBody().setCollideWorldBounds(true);
    }

    // When unit is selected, emphasis the actor
    protected onSelect() {
        const center = this.getBody().center
        if(this.selectedCircle) {
            this.selectedCircle.destroy()
        }
        this.selectedCircle = this.scene.add.circle(center.x , center.y , this.getBody().height /2, 0x666666);
        this.selectedCircle.setDepth(-1)
    }

    protected onUnselect() {
        if(this.selectedCircle){
            this.selectedCircle.destroy()
            this.selectedCircle = null
        }
    }

    public getDamage(value?: number): void {
        this.scene.tweens.add({
            targets: this,
            duration: 100,
            repeat: 3,
            yoyo: true,
            alpha: 0.5,
            onStart: () => {
                if (value) {
                    this.hp = this.hp - value;
                }
            },
            onComplete: () => {
                this.setAlpha(1);
            },
        });
    }

    public getHPValue(): number {
        return this.hp;
    }

    protected checkFlip(): void {
        if (this.body.velocity.x < 0) {
            this.scaleX = -1;
        } else {
            this.scaleX = 1;
        }
    }

    protected getBody(): Physics.Arcade.Body {
        return this.body as Physics.Arcade.Body;
    }
}
