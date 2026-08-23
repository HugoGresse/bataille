export type MoveModifiers = { shiftKey?: boolean; altKey?: boolean }

/**
 * The whole stack goes by default, which is how the game is played most of the time.
 * Shift sends half, Alt sends a single unit.
 */
export const moveAmountFor = (stackSize: number, modifiers?: MoveModifiers): number => {
    const size = Math.max(1, Math.floor(stackSize))
    if (modifiers?.altKey) {
        return 1
    }
    if (modifiers?.shiftKey) {
        return Math.max(1, Math.floor(size / 2))
    }
    return size
}
