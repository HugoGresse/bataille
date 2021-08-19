'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.MAX_UNIT_LIFE =
    exports.UnitsType =
    exports.TILE_WIDTH_HEIGHT =
    exports.UNIT_STICK =
    exports.BUILDING_TOWN =
        void 0
exports.BUILDING_TOWN = 'b-town'
exports.UNIT_STICK = 'u-stick'
exports.TILE_WIDTH_HEIGHT = 32
var UnitsType
;(function (UnitsType) {
    UnitsType[(UnitsType['Stick'] = 1)] = 'Stick'
    UnitsType[(UnitsType['Bar'] = 2)] = 'Bar'
    UnitsType[(UnitsType['Medic'] = 3)] = 'Medic'
    UnitsType[(UnitsType['Wheelie'] = 4)] = 'Wheelie'
})((UnitsType = exports.UnitsType || (exports.UnitsType = {})))
exports.MAX_UNIT_LIFE = 100
