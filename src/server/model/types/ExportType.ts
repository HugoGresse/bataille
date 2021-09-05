import { MapTilesPublic } from './MapTilesPublic'
import { PrivateGameState } from '../GameState'

export type ExportType = {
    gameId: string
    map: MapTilesPublic
}

export interface ExportTypeWithGameState extends ExportType {
    gameState: PrivateGameState
}
