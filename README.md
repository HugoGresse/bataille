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

Everything is build around Node & TypeScript, using Phaser4 for the game engine on the web (webgl) and socket.io for server-client communication.

## Setup

Requires Node 26 (see `.nvmrc`).

0. Copy `.env.example` to `.env` and fill:
    - `VITE_SOCKET_URL=localhost:3001`
    - `SUMOLOGIC_COLLECTOR` can stay blank (used to track number of games played)
1. `npm i`
2. `npm run start`
3. `npm run start-server`
4. Open `localhost:3000`, local dev should work with one player, online require 2 players.


## Issues : 

1. Unit moving crossing another allied troop merge, not idea if they are just on there way
2. Display the path finding preview and selected cell 
3. Add unit test on the server loop and code 
4. Optimize server performance 
5. Very fun game! However, one thing that bothered me is that in the early game, where there is a massive amount of cities changing hands, the center of the screen tends to be filled. I suggest moving takeover notices that don't include you to a bottom corner, while keeping the ones that do involve you in the center.
6. Don't display AI killing themself messages