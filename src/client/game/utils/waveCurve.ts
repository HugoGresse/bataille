export type WaveFrame = { scale: number; alpha: number; width: number }

/**
 * Hand-drawn curve for the capture ripple. Linear timing alone pops then hangs, and an easing
 * function is re-applied per keyframe interval, which visibly stutters the travel: so the shape
 * lives in the values and the tween runs linear.
 */
const CURVE: (WaveFrame & { at: number })[] = [
    { at: 0, scale: 0.34, alpha: 0.95, width: 3 },
    { at: 0.25, scale: 1.36, alpha: 0.78, width: 2.4 },
    { at: 0.5, scale: 2.16, alpha: 0.55, width: 1.9 },
    { at: 0.75, scale: 2.86, alpha: 0.3, width: 1.4 },
    { at: 1, scale: 3.4, alpha: 0, width: 1 },
]

export const sampleWave = (progress: number): WaveFrame => {
    const t = Math.min(1, Math.max(0, progress))
    let lower = CURVE[0]
    let upper = CURVE[CURVE.length - 1]
    for (let index = 0; index < CURVE.length - 1; index++) {
        if (t >= CURVE[index].at && t <= CURVE[index + 1].at) {
            lower = CURVE[index]
            upper = CURVE[index + 1]
            break
        }
    }
    const span = upper.at - lower.at
    const k = span === 0 ? 0 : (t - lower.at) / span
    return {
        scale: lower.scale + (upper.scale - lower.scale) * k,
        alpha: lower.alpha + (upper.alpha - lower.alpha) * k,
        width: lower.width + (upper.width - lower.width) * k,
    }
}
