/**
 * Prevent needed for mapping to number when iterating on Object.keys()
 * from https://stackoverflow.com/a/59459000/1377145
 */
export const getKeys = Object.keys as <T extends object>(obj: T) => Array<keyof T>
