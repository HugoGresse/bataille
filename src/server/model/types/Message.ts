import { PublicPlayerState } from '../GameState'

export type Message = {
    content: string
    player: PublicPlayerState | null
}
