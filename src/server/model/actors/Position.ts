export class Position {

    constructor(protected x: number, protected y: number) {

    }

    get(){
        return {
            x: this.x,
            y: this.y
        }
    }


}
