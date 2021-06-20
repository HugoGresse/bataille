import {UnitsType} from '../../common/UNITS'
import {TilePublic} from './map/Tile'

export interface GameState {

    status: "running",
    players: PlayerState[]
    units: UnitState[]
    towns: TownsState[]
}

export interface PlayerState {
    name: string,
    income: number,
    money: number
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


export interface TownsState extends TilePublic{

}
