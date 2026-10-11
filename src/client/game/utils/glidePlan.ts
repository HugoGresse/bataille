import { SERVER_TICK_MS } from '../../../common/GameSettings'
import { SPEED_FACTOR, STICK_SPEED, TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { distanceBetween, Point } from './pinchZoom'

/** A settle onto the server position: short enough to read as a nudge, not a move */
export const SETTLE_MS = 90
/** Diagonal steps are about 1.4 tiles: a piece further off than this has fallen behind */
const ONE_STEP = TILE_WIDTH_HEIGHT * 1.5
/** A step on open ground, the tick the wait starts on included: the pace a piece walks back at */
const WALK_MS_PER_TILE = SERVER_TICK_MS + SPEED_FACTOR / STICK_SPEED
/** How far off the line between its tile and the next a piece can be and still be on its way there */
const ON_TRACK = 3

export type GlidePlan = {
    /** Put the piece straight here first: it is too far off for a glide to look like movement */
    snapTo: Point | null
    /** Pass through here on the way: the stack was re-routed, and its path starts from its own tile */
    via: Point | null
    to: Point
    ms: number
}

/** Distance from a point to the segment between two others */
const distanceToSegment = (point: Point, from: Point, to: Point): number => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = dx * dx + dy * dy
    if (!length) {
        return distanceBetween(point, from)
    }
    const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length))
    return distanceBetween(point, { x: from.x + t * dx, y: from.y + t * dy })
}

/**
 * Where a piece glides next. A moving stack is reported with the tile it steps onto next and when,
 * so the piece heads there and lands as the server step does: no lag behind the fights and captures
 * it causes, and no pause between tiles. Otherwise it walks back onto its server position.
 */
export const glidePlan = (shown: Point, server: Point, next?: Point, msToNext?: number): GlidePlan => {
    const offBy = distanceBetween(shown, server)
    if (offBy > ONE_STEP) {
        return next && msToNext
            ? { snapTo: server, via: null, to: next, ms: msToNext }
            : { snapTo: server, via: null, to: server, ms: 0 }
    }
    if (next && msToNext) {
        // Still on its way to that tile: carry on. Re-routed: back through its own tile first, so it
        // follows the path rather than a shortcut over ground the path goes round
        const onTrack = distanceToSegment(shown, server, next) <= ON_TRACK
        return { snapTo: null, via: onTrack ? null : server, to: next, ms: msToNext }
    }
    // Stopped short of a tile it was gliding to: walk back rather than jump
    return {
        snapTo: null,
        via: null,
        to: server,
        ms: Math.max(SETTLE_MS, (offBy / TILE_WIDTH_HEIGHT) * WALK_MS_PER_TILE),
    }
}
