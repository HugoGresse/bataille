import { MapTilesPublic } from './MapTilesPublic'
import { PrivateGameState } from '../GameState'

export type ExportType = {
    gameId: string
    map: MapTilesPublic
    /** Constant for the whole game, so it rides along with the map rather than every state tick */
    townsToWin: number
}

export interface ExportTypeWithGameState extends ExportType {
    gameState: PrivateGameState
}
