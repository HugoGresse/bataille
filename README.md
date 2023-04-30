# Bataille

A risk like game, in TypeScript, revamped for quick bataille and fun.

> https://bataille.ovh

### Featuring

-   real time unit movements
-   turn by turn income (7s)
-   up to 6 players (will probably be increased when popularity will grow)
-   public in-game discussion
-   game time: 10-20min

[Video gameplay](https://www.youtube.com/watch?v=dIgEd0i-_YI)

![Game screenshots](https://user-images.githubusercontent.com/662377/130512746-80ee7ef5-6b89-4222-948d-e14904b078f5.png)

# Developers

Everything is build around Node & TypeScript, using Phaser3 for the game engine on the web (webgl) and socket.io for server-client communication.

## Setup

0. Copy `.env.example` to `.env` and fill:
    - `REACT_APP_SOCKET_URL=localhost:3001`
    - `SUMOLOGIC_COLLECTOR` can stay blank (used to track number of games played)
1. `npm i`
2. `npm run start`
3. `npm run start-server`
4. Open `localhost:3000`, local dev should work with one player, online require 2 players.
