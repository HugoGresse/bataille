import { TilePublic } from './map/Tile'

export enum GameStatus {
    running,
    stopped,
}

export interface GameState {
    s: GameStatus // status
    ni: number // next income seconds
    ps: PublicPlayerState[] // players States
    u: {
        // units
        updated: UnitState[]
        deleted: UnitState[]
    }
    t: TownsState[] // towns
}

export interface PrivateGameState extends GameState {
    cp: PrivatePlayerState
}
export interface PrivateGameStateUpdate extends GameState {
    cp: PrivatePlayerStateUpdate
}

export interface PrivatePlayerState extends PublicPlayerState {
    m: number // Money
}
export interface PrivatePlayerStateUpdate {
    m: number // Money
}
export interface PublicPlayerState {
    n: string // Name
    i: number // Income
    c: string // color
    ctr: string[] // countries
    cnt: boolean // connected
    d: boolean // dead
    s: boolean // surrender
}

export interface UnitState {
    id: string // id
    hp: number // hp
    p: {
        // position
        x: number
        y: number
    }
    c: string // color
}

export interface TownsState extends TilePublic {}
