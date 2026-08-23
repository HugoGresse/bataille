// Headless integration game: spawns the game server on a scratch port, joins as a human
// player against AIs and PLAYS (creates units, moves & splits stacks) without any UI,
// asserting core mechanics along the way.
//
// Usage: npm run play:test   (or: node scripts/play-headless.mjs)
import { spawn } from 'node:child_process'
import { io } from 'socket.io-client'

const PORT = 3009
const MAX_RUNTIME_MS = 150_000
const DECISION_MS = 1200
const REORDER_MS = 4000

// ---------- checks ----------
const checks = {
    receivedInit: false,
    updatesFlowing: false,
    niAlwaysDefined: true,
    createdUnits: false,
    movedUnits: false,
    splitObserved: false,
    gameEnded: false,
}
let updateCount = 0

// ---------- state folded from deltas ----------
let gameId = null
let myName = null
let myColor = null // normalized '#rrggbb'
let money = 0
/** id -> {hp, x, y} */
const myUnits = new Map()
const enemyUnits = new Map()
const myTownTiles = new Set() // 'tx,ty'
/** move orders sent per unit id */
const lastOrderAt = new Map()
/** last known tile per my unit id, to detect actual movement */
const seenTiles = new Map()
let lastMoney = null
/** pending split expectations: {id, hpBefore, tileX, tileY} */
const splitExpectations = []
let maxSeenStackHp = 1

const norm = (c) => String(c).replace('0x', '').replace('#', '').toLowerCase()
const isMine = (unitState) => myColor !== null && norm(unitState.c) === myColor

// ---------- server lifecycle ----------
const server = spawn('npx', ['tsx', 'src/server/server.ts'], {
    cwd: new URL('.', import.meta.url).pathname + '..',
    env: { ...process.env, PORT: String(PORT), MIN_PLAYER: '1', IA_PLAYER_PER_GAME: '3' },
    stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`))
server.stderr.on('data', (d) => process.stdout.write(`[srv:err] ${d}`))

const cleanup = (exitCode) => {
    try {
        server.kill('SIGTERM')
    } catch {
        /* already gone */
    }
    setTimeout(() => process.exit(exitCode), 300)
}

const finish = (reason) => {
    console.log(`\n=== HEADLESS GAME FINISHED (${reason}) ===`)
    for (const [name, passed] of Object.entries(checks)) {
        console.log(`  ${passed ? '✅' : '❌'} ${name}`)
    }
    const ok =
        checks.receivedInit &&
        checks.updatesFlowing &&
        checks.niAlwaysDefined &&
        checks.createdUnits &&
        checks.movedUnits &&
        checks.splitObserved
    console.log(`  max stack hp seen: ${maxSeenStackHp}, updates: ${updateCount}`)
    console.log(ok ? 'RESULT: PASS ✅' : 'RESULT: FAIL ❌')
    cleanup(ok ? 0 : 1)
}

const hardTimeout = setTimeout(() => finish('timeout'), MAX_RUNTIME_MS)

// wait for server to listen before connecting
server.stdout.on('data', (d) => {
    if (String(d).includes(`Server started on port ${PORT}`)) startClient()
})

// ---------- bot client ----------
function startClient() {
    const socket = io(`http://localhost:${PORT}`, { transports: ['websocket'] })

    socket.on('connect', () => socket.emit('c-player/joinLobby', 'HeadlessBot'))

    socket.on('s/game/init', (data) => {
        checks.receivedInit = true
        gameId = data.gameId
        myName = data.gameState.cp.n
        myColor = norm(data.gameState.cp.c)
        money = data.gameState.cp.m
        for (const u of data.gameState.u.updated) foldUnit(u)
        // starting units sit on towns assigned to us
        for (const u of myUnits.values()) myTownTiles.add(`${Math.floor(u.x / 32)},${Math.floor(u.y / 32)}`)
        console.log(
            `[bot] game ${gameId} started as ${myName} (${myColor}), ${myUnits.size} starting stacks, towns known: ${myTownTiles.size}`
        )
        setInterval(() => decide(socket), DECISION_MS)
    })

    socket.on('s/gameState', (state) => {
        updateCount++
        if (updateCount === 50) checks.updatesFlowing = true
        if (state.ni === undefined || state.ni === null) checks.niAlwaysDefined = false
        if (typeof state.cp?.m === 'number') {
            money = state.cp.m
            // only `newUnit` spends money: a decrease proves unit creation reached the engine
            if (lastMoney !== null && state.cp.m < lastMoney) checks.createdUnits = true
            lastMoney = state.cp.m
        }

        for (const u of state.u.updated ?? []) foldUnit(u)
        for (const u of state.u.deleted ?? []) {
            myUnits.delete(u.id)
            enemyUnits.delete(u.id)
        }
        for (const t of state.t ?? []) {
            if (t.p?.n === myName && Number.isFinite(t.x)) {
                myTownTiles.add(`${t.x},${t.y}`) // captured or confirmed town
            }
        }
        verifySplitExpectations()
    })

    socket.on('s/gameMessage', (message) => {
        if (/won by|No winner/.test(message.content ?? '')) {
            checks.gameEnded = true
            console.log(`[bot] ${message.content}`)
            clearTimeout(hardTimeout)
            finish('game-end')
        }
    })

    socket.on('disconnect', (reason) => console.log(`[bot] socket disconnect: ${reason}`))
    socket.on('connect_error', (err) => console.log(`[bot] connect error: ${err.message}`))
}

function foldUnit(u) {
    if (!u?.p) return
    if (isMine(u)) {
        myUnits.set(u.id, { hp: u.hp, x: u.p.x, y: u.p.y })
        if (u.hp > maxSeenStackHp) maxSeenStackHp = u.hp
        const tile = `${Math.floor(u.p.x / 32)},${Math.floor(u.p.y / 32)}`
        if (seenTiles.has(u.id) && seenTiles.get(u.id) !== tile) {
            if (!checks.movedUnits) {
                console.log(`[bot] movement detected: stack ${u.id.slice(0, 8)} ${seenTiles.get(u.id)} -> ${tile}`)
            }
            checks.movedUnits = true
        }
        seenTiles.set(u.id, tile)
    } else {
        enemyUnits.set(u.id, { hp: u.hp, x: u.p.x, y: u.p.y })
    }
}

// ---------- decisions ----------
function decide(socket) {
    if (!gameId) return

    // 1. grow a stack on one of our town tiles when affordable
    if (money >= 1 && myTownTiles.size > 0) {
        const [tx, ty] = [...myTownTiles][0].split(',').map(Number)
        socket.emit('c-player/newUnit', gameId, { x: tx * 32, y: ty * 32, unitCount: 1 })
        if (money >= 3) {
            socket.emit('c-player/newUnit', gameId, { x: tx * 32, y: ty * 32, unitCount: 2 })
        }
    }

    // 2. order idle stacks around: half short hops (almost always reachable), half toward enemies
    const now = Date.now()
    for (const [id, unit] of myUnits) {
        if ((lastOrderAt.get(id) ?? 0) > now - REORDER_MS) continue
        lastOrderAt.set(id, now)

        let target
        if (Math.random() < 0.5) {
            const dx = [-1, 0, 1][Math.floor(Math.random() * 3)]
            const dy = [-1, 0, 1][Math.floor(Math.random() * 3)]
            target = { x: unit.x + dx * 32, y: unit.y + dy * 32 }
        } else {
            target = pickTarget(unit)
        }

        if (unit.hp >= 4 && Math.random() < 0.4) {
            const amount = Math.max(1, Math.floor(unit.hp / 2))
            splitExpectations.push({ id, hpBefore: unit.hp, tileX: Math.floor(unit.x / 32), tileY: Math.floor(unit.y / 32), at: now })
            socket.emit('c-player/unit', gameId, {
                unitId: id,
                type: 0,
                data: { destination: { x: target.x, y: target.y }, amount },
            })
        } else {
            socket.emit('c-player/unit', gameId, {
                unitId: id,
                type: 0,
                data: { destination: { x: target.x, y: target.y } },
            })
        }
    }
}

function pickTarget(from) {
    let best = null
    let bestDist = Infinity
    for (const e of enemyUnits.values()) {
        const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2
        if (d < bestDist) {
            bestDist = d
            best = e
        }
    }
    if (best) return { x: best.x, y: best.y }
    // wander
    return {
        x: Math.min(4900, Math.max(100, from.x + (Math.random() - 0.5) * 1600)),
        y: Math.min(5900, Math.max(100, from.y + (Math.random() - 0.5) * 1600)),
    }
}

/**
 * A split "counts" once the mover's stack shrank AND another of our stacks appeared on/near
 * the vacated tile within a few seconds.
 */
function verifySplitExpectations() {
    const now = Date.now()
    for (const exp of [...splitExpectations]) {
        const mover = myUnits.get(exp.id)
        const shrank = mover && mover.hp < exp.hpBefore
        // the mover must have actually left the origin tile...
        const departed =
            mover && (Math.floor(mover.x / 32) !== exp.tileX || Math.floor(mover.y / 32) !== exp.tileY)
        // ...and a DIFFERENT stack of ours must now sit on the vacated tile
        const remnantLeftBehind = [...myUnits.entries()].some(
            ([uid, u]) =>
                uid !== exp.id &&
                Math.floor(u.x / 32) === exp.tileX &&
                Math.floor(u.y / 32) === exp.tileY
        )
        if (shrank && departed && remnantLeftBehind) {
            checks.splitObserved = true
            console.log(
                `[bot] ✂️ split observed: mover ${exp.hpBefore}->${mover?.hp}hp departed tile ${exp.tileX},${exp.tileY}, remnant left behind`
            )
            splitExpectations.splice(splitExpectations.indexOf(exp), 1)
        } else if (now - exp.at > 20000) {
            splitExpectations.splice(splitExpectations.indexOf(exp), 1)
        }
    }
}
