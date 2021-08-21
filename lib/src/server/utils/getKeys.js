'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.getKeys = void 0
/**
 * Prevent needed for mapping to number when iterating on Object.keys()
 * from https://stackoverflow.com/a/59459000/1377145
 */
exports.getKeys = Object.keys
