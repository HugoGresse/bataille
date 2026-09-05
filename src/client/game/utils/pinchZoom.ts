export const MIN_ZOOM = 0.2
export const MAX_ZOOM = 2
export const WHEEL_ZOOM_STEP = 0.08

export type Point = { x: number; y: number }

export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

export const distanceBetween = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * The zoom after two fingers moved from `previousDistance` apart to `distance` apart: the map
 * scales by the same ratio, so what sat under the fingers stays about the same size as they do.
 */
export const pinchedZoom = (current: number, previousDistance: number, distance: number): number => {
    if (previousDistance <= 0 || distance <= 0) {
        return current
    }
    return clampZoom(current * (distance / previousDistance))
}
