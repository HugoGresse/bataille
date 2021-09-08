'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.isProduction = exports.ADMIN_PWD = exports.ADMIN_USER = exports.ADMIN_KEY = exports.PORT = void 0
exports.PORT = parseInt(process.env.PORT) || 3001
exports.ADMIN_KEY = process.env.ADMIN_KEY
exports.ADMIN_USER = process.env.ADMIN_USER
exports.ADMIN_PWD = process.env.ADMIN_PWD
exports.isProduction = process.env.NODE_ENV === 'production'
