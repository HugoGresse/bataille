import {UnitsType} from '../../constants/UNITS'

export interface GameState {

    status: "running",
    players: PlayerState[]
    units: UnitState[]
    towns: TownsState[]
}

export interface PlayerState {
    name: string
}

export interface UnitState {
    id: string,
    type: UnitsType,
    hp: {
        current: number,
        initial: number
    },
    position: {
        x: number,
        y: number
    }

}


export interface TownsState {

}
