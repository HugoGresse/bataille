/**
 * Share of the winning total the leader has to reach before the standings turn into a race. Below
 * it the panel stays what it always was, a ranking by income; above it the game has a shape worth
 * watching and every row grows a bar.
 */
export const PROGRESS_REVEAL_RATIO = 0.5

/**
 * Whether the endgame is close enough to be worth drawing. Reads on every player rather than
 * picking the leader out first: the leader is whoever holds the most, so testing them all answers
 * the same question with nothing to keep in sync.
 */
export const shouldShowVictoryProgress = (townsHeld: number[], townsToWin: number): boolean =>
    townsToWin > 0 && townsHeld.some((held) => held >= townsToWin * PROGRESS_REVEAL_RATIO)

/** How full one player's bar sits, clamped so an overshoot past the bar cannot spill out of the row */
export const victoryFraction = (townsHeld: number, townsToWin: number): number =>
    townsToWin > 0 ? Math.min(1, Math.max(0, townsHeld / townsToWin)) : 0
