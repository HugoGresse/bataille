import { distanceBetween, Point } from '../../utils/pinchZoom'

/** Angles are in degrees from straight up, clockwise, as the eye reads a dial */
export type RingGeometry = {
    /** Each satellite's angle off the heading the fan points along */
    spread: number[]
    arcRadius: number
    satRadius: number
    /** Room under a satellite taken by its keycap */
    capHeight: number
    /** The close button sits this far from the city, on the side away from the fan */
    closeDistance: number
    closeRadius: number
}

export type Rect = { x: number; y: number; width: number; height: number }

/** The screen, less the corners other controls already own: a button under them cannot be pressed */
export type RingView = { width: number; height: number; reserved?: Rect[] }

/** Tried in this order, so a tie keeps the fan above the city where it has always opened */
export const HEADINGS = [0, 45, -45, 90, -90, 135, -135, 180]

/** Screen distance from a town's centre a satellite has to keep for the town and its name to read */
const TOWN_CLEARANCE = 22
/** A satellite hanging off the screen cannot be pressed, which is worse than hiding a town */
const CLIPPED_COST = 10

export const fanPoint = (origin: Point, angle: number, radius: number): Point => {
    const radians = (angle * Math.PI) / 180
    return { x: origin.x + Math.sin(radians) * radius, y: origin.y - Math.cos(radians) * radius }
}

const overlaps = (point: Point, radius: number, rect: Rect): boolean =>
    point.x + radius > rect.x &&
    point.x - radius < rect.x + rect.width &&
    point.y + radius > rect.y &&
    point.y - radius < rect.y + rect.height

/** A button the screen edge cuts off, or that sits under another control, cannot be pressed */
const isClipped = (point: Point, radius: number, below: number, view: RingView): boolean =>
    point.x - radius < 0 ||
    point.x + radius > view.width ||
    point.y - radius < 0 ||
    point.y + radius + below > view.height ||
    (view.reserved ?? []).some((rect) => overlaps(point, radius, rect))

/**
 * What a heading costs: one for every town a satellite would sit on, and much more for a satellite
 * or close button the screen edge cuts off or another control covers.
 */
export const headingCost = (
    heading: number,
    origin: Point,
    towns: Point[],
    view: RingView,
    geometry: RingGeometry
): number => {
    const { satRadius, arcRadius, capHeight } = geometry
    let cost = 0
    const close = fanPoint(origin, heading + 180, geometry.closeDistance)
    if (isClipped(close, geometry.closeRadius, 0, view)) {
        cost += CLIPPED_COST
    }
    for (const offset of geometry.spread) {
        const sat = fanPoint(origin, heading + offset, arcRadius)
        if (isClipped(sat, satRadius, capHeight, view)) {
            cost += CLIPPED_COST
        }
        for (const town of towns) {
            if (distanceBetween(sat, town) < satRadius + TOWN_CLEARANCE) {
                cost += 1
            }
        }
    }
    return cost
}

/**
 * Which way the muster fan should point so it hides as few neighbouring towns as possible and stays
 * on screen. The current heading is kept unless another one is strictly better, so the fan does not
 * flutter between two equal choices while the camera moves.
 */
export const chooseHeading = (
    origin: Point,
    towns: Point[],
    view: RingView,
    geometry: RingGeometry,
    current: number | null = null
): number => {
    let best = current ?? HEADINGS[0]
    let bestCost = headingCost(best, origin, towns, view, geometry)
    for (const heading of HEADINGS) {
        const cost = headingCost(heading, origin, towns, view, geometry)
        if (cost < bestCost) {
            best = heading
            bestCost = cost
        }
    }
    return best
}
