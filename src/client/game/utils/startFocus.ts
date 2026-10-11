import { TILE_WIDTH_HEIGHT } from '../../../common/UNITS'
import { distanceBetween, Point } from './pinchZoom'

/** Towns closer than this to one another are framed together: about a screen's width on a phone */
export const CLUSTER_RADIUS = 12 * TILE_WIDTH_HEIGHT
/** Room left around the framed towns, so the outermost ones are not glued to the screen edge */
const FRAME_PADDING = 3 * TILE_WIDTH_HEIGHT
/** Never so far out that a town's name cannot be read, nor so close that nothing around it shows */
export const MIN_START_ZOOM = 0.45
export const MAX_START_ZOOM = 1

export type StartFocus = { x: number; y: number; zoom: number }

/**
 * The biggest group of points lying within `radius` of one of them. Starting towns are dealt out at
 * random across the map, so "all of them" is often the whole continent: framing the densest group
 * gives a view you can actually play from. Ties go to the first point, to stay deterministic.
 */
export const densestCluster = (points: Point[], radius: number = CLUSTER_RADIUS): Point[] => {
    let best: Point[] = []
    for (const anchor of points) {
        const group = points.filter((point) => distanceBetween(anchor, point) <= radius)
        if (group.length > best.length) {
            best = group
        }
    }
    return best
}

/**
 * Where the camera should open: centred on the player's densest group of towns, zoomed so the group
 * fits the view. `view` is the screen size in CSS pixels, so the zoom returned is the logical one
 * the player would pick, without the device pixel factor. Null when the player owns nothing.
 */
export const startFocus = (points: Point[], view: { width: number; height: number }): StartFocus | null => {
    const cluster = densestCluster(points)
    if (!cluster.length) {
        return null
    }
    const xs = cluster.map((point) => point.x)
    const ys = cluster.map((point) => point.y)
    const minX = Math.min(...xs) - FRAME_PADDING
    const maxX = Math.max(...xs) + FRAME_PADDING
    const minY = Math.min(...ys) - FRAME_PADDING
    const maxY = Math.max(...ys) + FRAME_PADDING

    const fit = Math.min(view.width / (maxX - minX), view.height / (maxY - minY))
    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        zoom: Math.min(MAX_START_ZOOM, Math.max(MIN_START_ZOOM, fit)),
    }
}
