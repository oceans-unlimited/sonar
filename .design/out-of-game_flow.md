# Out-of-Game Flow

Trying to outline the flow into and out of a game for a user. Goal is to answer questions like the following.
* What if a user disconnects or their computer decides to update during crucial gameplay?
* If a user disconnects, how can they reconnect?
* Should there be a "pause" button (enforced across clients)? If so, who can unpause the game?

Updated based on 2025-09-26 discussion.

## Before the Game

User opens the website, and clicks "start" (or maybe they just auto-connect to the server; TBD). They are given a random default name ("Player X" for now). They are able to see things like who joined what teams and who has what roles.

They can select a role on either team (selecting team and role is a single action).

After selecting a team and a role, they can indicate that they are ready for the game to begin.

There are two scenarios to consider: either the game has already begun when the user goes to the server, or the game has not begun yet.
* If the game has not begun yet: when all roles are selected and all players have indicated "ready", the countdown proceeds and then the game begins.
* If the game has already begun: any user who indicates they are ready immediately joins the game in their selected role.

Quitting the browser tab or leaving a team role will move a player out of the "ready" state and prevent the game from starting.

## During the Game

Once the game has begun, there are two things that can pause gameplay for everyone (aside from in-game pause actions).
* A user disconnects (defined as the user is unable to play and the server can detect that the user is unable to play).
* A captain pauses the game.

When the captain pauses the game (aside from in-game pause actions), the only way the game resumes is if all players select "ready".

When a user disconnects, the game is paused until a user joins the server, selects the team/role of the disconnected user, and then indicates "ready" in the lobby. After they have joined the game, everyone must still have indicated "ready" on the pause screen to resume the game.

In-game pauses are superceded by out-of-game pauses.

## After the Game

Whenever a win condition has been met, the players will return to the lobby immediately with no roles or teams selected. (This is, of course, after the client displays some satisfying victory/crushing defeat animation for the user.) Note: underlying game state can immediately switch to lobby state; user screens might display overlay, but state is already back to lobby.
