import { Grid } from 'pathfinding'
import { vi } from 'vitest'
import { GameMap } from '../src/server/model/map/GameMap'
import { IAPlayer } from '../src/server/model/player/IAPlayer'
import { StickUnit } from '../src/server/model/actors/units/StickUnit'
import { Position } from '../src/server/model/actors/Position'
import { UnitsProcessor } from '../src/server/engine/UnitsProcessor'
import { TILE_WIDTH_HEIGHT } from '../src/common/UNITS'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../src/common/UnitAction'
import { PlayersById } from '../src/server/model/types/PlayersById'

export const TILE = TILE_WIDTH_HEIGHT

/** A fully walkable fake map: enough for pathfinding + velocity, without the heavy real map data */
export const makeWalkableMap = (width = 40, height = 40): GameMap => {
    const matrix: number[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => 0))
    return {
        getTileAt: () => ({ velocityFactor: 1 }),
        pathFindingGrid: new Grid(matrix),
    } as unknown as GameMap
}

export const makePlayer = (name: string, color = '0xFF0000'): IAPlayer => new IAPlayer(color, name)

export const spawnUnit = (
    processor: UnitsProcessor,
    player: IAPlayer,
    tileX: number,
    tileY: number,
    hp = 1
): StickUnit => {
    const unit = new StickUnit(player, new Position(tileX * TILE + TILE / 2, tileY * TILE + TILE / 2), hp)
    const created = processor.addUnit(unit, player, tileX, tileY)
    if (!created) {
        throw new Error(`failed to spawn unit at ${tileX},${tileY}`)
    }
    return created as StickUnit
}

export const orderMove = (
    processor: UnitsProcessor,
    player: IAPlayer,
    unit: StickUnit,
    destTileX: number,
    destTileY: number,
    amount?: number
) => {
    processor.unitAction(
        player,
        new UnitAction(
            unit.id,
            UnitActionType.Move,
            new UnitActionMoveData(new Position(destTileX * TILE, destTileY * TILE), amount)
        )
    )
}

export const toPlayersById = (players: IAPlayer[]): PlayersById =>
    players.reduce((acc, p) => {
        acc[p.id] = p
        return acc
    }, {} as PlayersById)

/** Advance fake system time by one server-ish tick and run one updateUnits pass */
export const tick = (
    processor: UnitsProcessor,
    map: GameMap,
    players: IAPlayer[],
    elapsedMs = 500
): ReturnType<UnitsProcessor['updateUnits']> => {
    vi.advanceTimersByTime(elapsedMs)
    return processor.updateUnits(map, toPlayersById(players))
}

/** Run ticks until `unit` is registered at `expectedTile` in the grid (or fail after maxTicks) */
export const runTicksUntilRegisteredAt = (
    processor: UnitsProcessor,
    map: GameMap,
    players: IAPlayer[],
    unit: StickUnit,
    expectedTile: { x: number; y: number },
    maxTicks = 30
) => {
    for (let i = 0; i < maxTicks; i++) {
        tick(processor, map, players)
        const at = gridUnitAt(processor, expectedTile.x, expectedTile.y)
        if (at === unit) {
            return
        }
    }
    throw new Error(
        `unit never registered at ${expectedTile.x},${expectedTile.y} after ${maxTicks} ticks (at ${JSON.stringify(
            unit.position.get()
        )})`
    )
}

export const tileOf = (unit: StickUnit): { x: number; y: number } => ({
    x: Math.floor(unit.position.get().x / TILE),
    y: Math.floor(unit.position.get().y / TILE),
})

export const gridUnitAt = (processor: UnitsProcessor, x: number, y: number): StickUnit | undefined =>
    processor.getUnits().get(x)?.get(y) as StickUnit | undefined
