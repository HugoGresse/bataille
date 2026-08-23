/**
 * Engine micro-benchmark: measures the server loop hot paths with a simulated clock,
 * no sockets needed. Usage: npx tsx scripts/bench-server.mts [units] [ticks]
 */
import { createRequire } from 'node:module'
import { UnitsProcessor } from '../src/server/engine/UnitsProcessor'
import { StickUnit } from '../src/server/model/actors/units/StickUnit'
import { Position } from '../src/server/model/actors/Position'
import { UnitAction, UnitActionMoveData, UnitActionType } from '../src/common/UnitAction'
import { GameMap } from '../src/server/model/map/GameMap'
import { IAPlayer } from '../src/server/model/player/IAPlayer'

const { Grid } = createRequire(import.meta.url)('pathfinding')

const UNIT_COUNT = Number(process.argv[2] ?? 400)
const TICKS = Number(process.argv[3] ?? 300)
const MAP_W = 120
const MAP_H = 150

// --- fake clock so units move every tick without waiting real delays ---
const realNow = Date.now.bind(Date)
let fakeNow = realNow()
Date.now = () => fakeNow

// --- fully walkable fake map ---
const matrix: number[][] = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => 0))
const map = {
    getTileAt: () => ({ velocityFactor: 1 }),
    pathFindingGrid: new Grid(matrix),
} as unknown as GameMap


const players = [new IAPlayer('0xFF0000', 'b1'), new IAPlayer('0x00FF00', 'b2'), new IAPlayer('0xFFFF00', 'b3'), new IAPlayer('0x00FFFF', 'b4')]
const playersById = Object.fromEntries(players.map((p) => [p.id, p]))
const processor = new UnitsProcessor()

let placed = 0
let seed = 42
const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
}

for (let x = 0; x < MAP_W && placed < UNIT_COUNT; x++) {
    for (let y = 0; y < MAP_H && placed < UNIT_COUNT; y++) {
        if ((x + y) % 2 !== 0) continue
        const player = players[placed % players.length]
        const unit = new StickUnit(player as never, new Position(x * 32 + 16, y * 32 + 16), 1 + Math.floor(rand() * 20))
        if (processor.addUnit(unit, player as never, x, y)) {
            // order a random walk so units keep moving & colliding
            const destX = Math.min(MAP_W - 1, Math.max(0, x + Math.floor(rand() * 30) - 15))
            const destY = Math.min(MAP_H - 1, Math.max(0, y + Math.floor(rand() * 40) - 20))
            processor.unitAction(
                player as never,
                new UnitAction(
                    unit.id,
                    UnitActionType.Move,
                    new UnitActionMoveData(new Position(destX * 32 + 16, destY * 32 + 16))
                )
            )
            placed++
        }
    }
}
console.log(`bench: ${placed} units, ${TICKS} ticks`)

// --- benchmark updateUnits ---
const durations: number[] = []
for (let t = 0; t < TICKS; t++) {
    fakeNow += 500 // force a move window each tick
    const start = performance.now()
    processor.updateUnits(map, playersById)
    durations.push(performance.now() - start)
}
const avg = durations.reduce((a, b) => a + b, 0) / durations.length
const sorted = [...durations].sort((a, b) => a - b)
const p95 = sorted[Math.floor(sorted.length * 0.95)]
console.log(`updateUnits: avg ${avg.toFixed(3)}ms | p95 ${p95.toFixed(3)}ms | max ${sorted[sorted.length - 1].toFixed(3)}ms`)

// --- benchmark updateTownsFromUnits (worst case: called because units moved) ---
const towns: { id: string; player: unknown }[] = []
for (let i = 0; i < 400; i++) {
    const tx = Math.floor(rand() * MAP_W)
    const ty = Math.floor(rand() * MAP_H)
    const occupant = (processor.getUnits() as Map<number, Map<number, unknown>>).get(tx)?.get(ty)
    if (!occupant) {
        continue
    }
}
// register synthetic towns occupied check via empty set: measure pure iteration cost
const startTowns = performance.now()
for (let t = 0; t < TICKS; t++) {
    fakeNow += 500
    // simulate the per-town occupancy lookup done by updateTownsFromUnits
    const units = processor.getUnits()
    let found = 0
    for (let tx = 0; tx < MAP_W; tx += 3) {
        for (let ty = 0; ty < MAP_H; ty += 3) {
            if (units.get(tx)?.get(ty)) found++
        }
    }
}
console.log(`town occupancy scans (${TICKS}x ${(MAP_W / 3) * (MAP_H / 3)} lookups): ${(performance.now() - startTowns).toFixed(2)}ms total`)

Date.now = realNow
