# Out-of-Game Flow

Trying to outline the flow into and out of a game for a user. Goal is to answer questions like the following.
* What if a user disconnects or their computer decides to update during crucial gameplay?
* If a user disconnects, how can they reconnect?
* Should there be a "pause" button (enforced across clients? If so, who can unpause the game?

## Before the Game

User opens the website, and clicks "start" (or maybe they just auto-connect to the server; TBD). They are given a random default name, which they can change at any time before the game starts. They are able to see things like who joined what teams and who has what roles.

They can (somehow) select a team and a role. They must at least select a team before they choose a role, but they could potentially select team and role at the same time (TBD).

After selecting a team and a role, they can indicate that they are ready for the game to begin.

There are two scenarios to consider: either the game has already begun when the user goes to the server, or the game has not begun yet.
* If the game has not begun yet: when all players have indicated "ready", the countdown starts. If all players are still indicating ready at the end of the countdown, the game begins.
* If the game has already begun: any user who indicates they are ready immediately joins the game in their selected role.

Quitting the browser tab, un-joining a team, or leaving a role--any of these actions will move a player out of the "ready" state and prevent the game from starting.

## During the Game

Once the game has begun, there are two things that can pause gameplay for everyone.
* A user disconnects (how this is detected is TBD).
* Any user pauses the game.

When a user pauses the game:
* no in-game actions are allowed for any players;
* only the user who paused the game can unpause the game.

When a user disconnects:
* if the game is paused, and the disconnected user is the one who paused it, then anyone can unpause the game;
* if the game is not paused, then the game is paused until a user joins the server, selects the team/role of the disconnected user, and then indicates "ready".

## After the Game

Whenever a win condition has been met, the players will return to the lobby with no roles or teams selected. (This is, of course, after the client displays some satisfying victory/crushing defeat animation for the user.)
