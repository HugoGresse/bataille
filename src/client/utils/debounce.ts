export const debounce = <T extends (...args: never[]) => void>(fn: T, waitMs: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => fn(...args), waitMs)
    }
}
