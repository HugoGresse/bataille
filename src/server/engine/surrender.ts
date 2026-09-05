import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { NeutralPlayerInstance } from '../model/player/NeutralPlayer'
import { GameMap } from '../model/map/GameMap'
import { TilePublic } from '../model/map/Tile'
import { UnitState } from '../model/GameState'
import { UnitsProcessor } from './UnitsProcessor'
import { SocketEmitter } from '../SocketEmitter'
import { updatePlayerIncome } from './updatePlayerIncome'

export type SurrenderOutcome = {
    deletedUnits: UnitState[]
    changedTowns: TilePublic[]
}

/**
 * A player leaves on purpose: their army disbands and their towns go back to neutral, so nobody is
 * handed a free empire and no ghost stacks sit on the board. Every player's income is re-read,
 * since the leaver's countries are no longer anyone's. The changes are returned for the next state
 * broadcast rather than emitted here, to keep this runnable without a game around it.
 *
 * @return null when there was nothing to do: already out, or not a real player
 */
export const surrenderPlayer = (
    player: AbstractPlayer,
    map: GameMap,
    unitsProcessor: UnitsProcessor,
    players: AbstractPlayer[],
    emitter: SocketEmitter
): SurrenderOutcome | null => {
    if (player.isOut) {
        return null
    }
    player.surrender()

    const deletedUnits = unitsProcessor.removeUnitsOf(player.id).map((unit) => unit.getPublicState())

    const changedTowns: TilePublic[] = []
    for (const town of map.getTowns()) {
        if (town.player?.id === player.id) {
            town.player = NeutralPlayerInstance
            town.isNeutral = true
            changedTowns.push(town.export())
        }
    }

    const townsByCountries = map.getTownsByCountries()
    for (const candidate of players) {
        updatePlayerIncome(townsByCountries, candidate, emitter)
    }
    player.setUnitCount(0)

    return { deletedUnits, changedTowns }
}
