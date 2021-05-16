"use strict";
exports.__esModule = true;
var socket_io_1 = require("socket.io");
var io = new socket_io_1.Server({});
io.on("connection", function (socket) {
    // ...
});
io.listen(3000);
