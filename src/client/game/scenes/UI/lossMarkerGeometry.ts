export type Point = { x: number; y: number }

export type MarkerPlacement = {
    position: Point
    /** true when the town itself is in view, so the marker can sit on it instead of on the edge */
    onScreen: boolean
    /** Degrees, 0 = pointing right, for rotating the arrow towards the town */
    angle: number
}

/**
 * Where to draw a marker for something at `target`: on the town when it is in view, otherwise on
 * the viewport edge along the line from the centre to it, so the arrow keeps the true bearing
 * instead of being snapped to the nearest side.
 */
export const placeMarker = (target: Point, width: number, height: number, margin: number): MarkerPlacement => {
    const centre = { x: width / 2, y: height / 2 }
    const dx = target.x - centre.x
    const dy = target.y - centre.y
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    const halfWidth = Math.max(1, width / 2 - margin)
    const halfHeight = Math.max(1, height / 2 - margin)
    if (Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight) {
        return { position: { x: target.x, y: target.y }, onScreen: true, angle }
    }

    // Ray from the centre, stopped by whichever inset edge it reaches first
    const scale = Math.min(halfWidth / Math.abs(dx || Number.EPSILON), halfHeight / Math.abs(dy || Number.EPSILON))
    return {
        position: { x: centre.x + dx * scale, y: centre.y + dy * scale },
        onScreen: false,
        angle,
    }
}

/** Two losses in the same direction at the same moment read as one attack, not two */
export const shouldMerge = (
    existing: { angle: number; at: number },
    candidate: { angle: number; at: number },
    maxDegrees = 22,
    withinMs = 2500
): boolean => {
    // Shortest way round the circle, so 179° and -175° are 6° apart rather than 354°
    const difference = Math.abs(((existing.angle - candidate.angle + 540) % 360) - 180)
    return difference <= maxDegrees && Math.abs(candidate.at - existing.at) <= withinMs
}

/**
 * What the marker says: which town, and what the loss actually costs. Income only changes when the
 * town was the last one holding a country together, so it is only shown when it moved.
 */
export const lossLabel = (townName: string, incomeLost: number, mergedCount: number): string => {
    const name = townName.toUpperCase()
    if (mergedCount > 0) {
        return `${name} +${mergedCount} MORE`
    }
    return incomeLost > 0 ? `${name} −${incomeLost}/TURN` : name
}
