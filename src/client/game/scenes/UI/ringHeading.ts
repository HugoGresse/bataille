import { distanceBetween, Point } from '../../utils/pinchZoom'

/** Angles are in degrees from straight up, clockwise, as the eye reads a dial */
export type RingGeometry = {
    /** Each satellite's angle off the heading the fan points along */
    spread: number[]
    arcRadius: number
    satRadius: number
    /** Room under a satellite taken by its keycap */
    capHeight: number
}

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

/**
 * What a heading costs: one for every town a satellite would sit on, and much more for a satellite
 * the screen edge cuts off.
 */
export const headingCost = (
    heading: number,
    origin: Point,
    towns: Point[],
    view: { width: number; height: number },
    geometry: RingGeometry
): number => {
    const { satRadius, arcRadius, capHeight } = geometry
    let cost = 0
    for (const offset of geometry.spread) {
        const sat = fanPoint(origin, heading + offset, arcRadius)
        const clipped =
            sat.x - satRadius < 0 ||
            sat.x + satRadius > view.width ||
            sat.y - satRadius < 0 ||
            sat.y + satRadius + capHeight > view.height
        if (clipped) {
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
    view: { width: number; height: number },
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
