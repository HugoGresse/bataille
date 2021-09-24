import { TilePublic } from './map/Tile'

export enum GameStatus {
    running,
    stopped,
}

export interface GameState {
    status: GameStatus
    nextIncome: number
    players: PublicPlayerState[]
    units: {
        updated: UnitState[]
        deleted: UnitState[]
    }
    towns: TownsState[]
    deltas?: GameState
}

export interface PrivateGameState extends GameState {
    cp: PrivatePlayerState
}
export interface PrivateGameStateUpdate extends GameState {
    cp: PrivatePlayerStateUpdate
}

export interface PrivatePlayerState extends PublicPlayerState {
    money: number
}
export interface PrivatePlayerStateUpdate {
    money: number
}
export interface PublicPlayerState {
    name: string
    income: number
    color: string
    countries: string[]
    connected: boolean
    dead: boolean
    surrender: boolean
}

export interface UnitState {
    id: string
    hp: number
    position: {
        x: number
        y: number
    }
    color: string
}

export interface TownsState extends TilePublic {}
