export interface XYMap {
    [x: number]: {
        [y: number]: any
    }
}
export interface XYMapWithType<T> {
    [x: number]: {
        [y: number]: T
    }
}
export function xyMapToArray<Type>(map: XYMap): Type[] {
    const xs = Object.keys(map).map(Number)

    return xs.reduce((acc: Type[], x) => {
        Object.keys(map[x])
            .map(Number)
            .forEach((y) => {
                acc.push(map[x][y])
            })
        return acc
    }, [])
}

export function iterateOnXYMap<Type>(map: XYMap, func: (type: Type, x: number, y: number) => void): void {
    const xs = Object.keys(map).map(Number)

    return xs.forEach((x) => {
        Object.keys(map[x])
            .map(Number)
            .forEach((y) => {
                func(map[x][y], x, y)
            })
    })
}
