"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINIMUM_PLAYER_PER_GAME = exports.MONEY_START = exports.INCOME_MS = void 0;
exports.INCOME_MS = 7000;
exports.MONEY_START = 4;
exports.MINIMUM_PLAYER_PER_GAME = process.env.MIN_PLAYER ? Number(process.env.MIN_PLAYER) : 6;
