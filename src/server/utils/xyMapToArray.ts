import { getKeys } from './getKeys'

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
    const results = []
    const xKeys = getKeys(map)
    let yKeys = []
    for (const x of xKeys) {
        yKeys = getKeys(map[x])
        for (const y of yKeys) {
            results.push(map[x][y])
        }
    }
    return results
}

export function iterateOnXYMap<Type>(map: XYMap, func: (type: Type, x: number, y: number) => void): void {
    const xKeys = getKeys(map)
    let yKeys = []
    for (const x of xKeys) {
        yKeys = getKeys(map[x])
        for (const y of yKeys) {
            func(map[x][y], x, y)
        }
    }
}
