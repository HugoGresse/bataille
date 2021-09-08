import { PublicPlayerState } from '../../model/GameState'

export type AdminUpdate = {
    games: GameData[]
}

export type GameData = {
    id: string
    duration: number
    players: PublicPlayerState[]
}
