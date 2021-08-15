"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newId = void 0;
var newId = function (length) {
    if (length === void 0) { length = 6; }
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
exports.newId = newId;
