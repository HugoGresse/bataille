/**
 * Phaser's NONE scale mode never follows its parent, so the canvas has to be resized by hand
 * whenever the container changes.
 *
 * The element the canvas lives in sizes itself to the canvas, so watching it would feed the canvas
 * size straight back in and it could never shrink. The element above it is laid out by the page, so
 * that is what gets measured. Returns a function that stops watching.
 */
export const trackParentSize = (
    parent: HTMLElement,
    onResize: (width: number, height: number) => void
): (() => void) => {
    const sizeSource = parent.parentElement ?? parent
    let lastWidth = 0
    let lastHeight = 0

    const apply = () => {
        const { width, height } = measure(sizeSource)
        if (!width || !height || (width === lastWidth && height === lastHeight)) {
            return
        }
        lastWidth = width
        lastHeight = height
        onResize(width, height)
    }

    const observer = new ResizeObserver(apply)
    observer.observe(sizeSource)
    window.addEventListener('resize', apply)
    apply()

    return () => {
        observer.disconnect()
        window.removeEventListener('resize', apply)
    }
}

/** Falls back to the viewport while the page is still laying out and the container measures zero */
export const measure = (element: HTMLElement): { width: number; height: number } => {
    const source = element.parentElement ?? element
    const width = element.clientWidth || source.clientWidth || window.innerWidth
    const height = element.clientHeight || source.clientHeight || window.innerHeight
    return { width, height }
}
