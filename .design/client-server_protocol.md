# Client-Server Protocol

To deal with user actions being transmitted to the server in real time and by multiple clients, I'd like to adhere to some constraints that help mitigate coordination issues between client and server.
* Server keeps all game state, and transmits any changes to the clients.
* Clients can send messages to the server indicating that an action was performed--but the client state should NOT actually be updated unless the server transmits the relevant change back to the client. (I.e., client UI and state is pessimistic.)

This specifically makes it easy to implement and enforce various kinds of pauses (game-wide pause, captain-specific pauses for certain actions, etc.). This also avoids synchronization issues due to optimistic client updates, like a slower client sending an action just after a pause, but before the client has received the pause notification from the server.

The game may be slightly slower than it would be with an optimistic client--but not by much, and it makes state management much MUCH easier. (If it's too slow, we can always change it later. I'd rather err on the side of easier-to-develop than fast-but-complicated.)

## Out-of-Game Protocol Outline

Two kinds of messages: client-to-server and server-to-client. These will be outlined together in terms of the flow from the user's perspective.

It's important to note an overall constraint (or, rather, lack thereof): it's not adversarial, in the sense that this game is an extension of an in-person board game. The game does not need to be designed with security in mind. With this in mind, I can take design shortcuts like sending all necessary game data for all players to all players (so technically the radio operator's client will have data available on exact game state of opponents--but the client just won't display that data).

Those constraints in mind, here is the protocol.

* User goes to website on browser, clicks "play".
  * On clicking "Play", they create a WebSocket connection (via socket.io wrappers) with the server.
  * On connection:
    * if no one is the gameAdmin, then the player connecting becomes the gameAdmin;
    * server sends "lobby_state" (gameAdmin, player info, selected roles on each sub).
    * client receives "lobby_state", and updates the UI to reflect the new state.
* User selects role on a specific sub.
  * On clicking the role, the client sends "select_team_and_role" with the team and role they selected.
  * Server receives "select_team_and_role".
    * If the chosen team/role is not already occupied, the user is removed from whatever other role they may have had, and then put in the new role.
    * The server sends "lobby_state" to all clients.
    * The client updates its UI to reflect the new state.
* User clicks "leave role" indicator on UI.
  * On clicking "leave role" indicator, client sends "leave_team_and_role" (no data required).
  * Server receives "leave_team_and_role".
    * If the client who sent the message is assigned to that team/role, then the player is removed from that team/role.
    * The server sends "lobby_state" to all clients.
* User selects another role. (See prior description.)
* User clicks "Ready".
  * On clicking the ready button, the client sends "player_ready" to the server.
  * Server receives "player_ready".
    * Player data is updated to record that player as "ready".
    * Server sends "lobby_state" to all clients.
    * If all players are ready, server does two things.
      * It sets state to "game beginning".
      * It sends "game_beginning" to all clients.
      * It uses setTimeout(3000, () => {...logic goes here...}) to do the following three things.
        * It sets state to "captains selecting roles".
        * It sends "begin_game" with initial game state to all clients.
        * It sends "captains_selecting_roles" to all clients.
* Captains select locations, everyone clicks "ready", and the action starts. (See section on in-game protocol for details.)
* During the game, captain presses "pause".
  * Client sends "pause" to server.
  * If game not already paused and player is captain, then game goes into "paused" state. (No messages except "ready" are processed.)
  * Server sends "game_paused" to all clients.
* User selects "ready" from pause screen.
  * Client sends "ready" to server.
  * Server receives "ready" message.
    * Player is marked as ready to resume.
    * If all roles on all subs marked as ready to resume, then server sets state to "game in progress" and sends "resume_game" to all players.
* During the game, a player's WebSocket connection is broken and/or closed, and it's detected by the server.
  * Server goes into "game_paused" state.
  * Server sends "game_state" with pause state to all clients.
  * Server sends "lobby_state" with updated player data (disconnected player missing from that data).
* Player who got disconnected then refreshes to go back into website, clicks Play, selects available team/role, and clicks "ready".
  * (See above for everything before player clicks "ready".)
  * Client sends "ready" to the server.
  * Server updates player as ready to start game.
  * Server sends "lobby_state" to all clients with updated player data.
  * Server sends "begin_game" to newly-ready client, with current game state.
* Once all roles on all subs have selected "ready" on pause screen, game resumes. (See earlier description for details.)
* Sometime later in the game, a win state is achieved by one team or the other.
  * When this win state occurs, the server sends "game_over" with information about winner, to all players.
  * Server sets state to "game not started".
  * Server sets all players to "not ready" in lobby state.
  * Server sends "lobby_state" to all players.
  
### In-Game Protocol

The in-game protocol will be somewhat more involved, but in general will be similar to the protocol above: clients will send actions to the server, and the server will respond with "game_state" messages containing the updated game state for the client.

Everything revolves around the actions performed by the CO and XO.

CO has the following actions.
* Choose starting point (once, at beginning of game).
* Move
* Surface (by choice)
* Surface (due to blackout)
* Activate System
  * Fire Torpedo
  * Drop Mine
  * Detonate Mine
  * Silent Running

XO can only activate two systems.
* Sonar
* Drone

Note: the pause action that the captain can execute is technically part of these actions as well.

* Choose a starting location.
  - All players join the server, select roles, indicate ready, and game begins.
  - Players are presented with a screen saying "waiting for captains to select starting positions".
  - Captains select locations.
  - All other players select "ready to resume".
  - Captains/XOs are now able to perform actions.

* Captain moves the ship in a valid direction.
  - Captains/XOs are able to perform actions.
  - Engineer attempts cross-out, is denied.
  - XO attempts charge, is denied.
  - Captain moves the ship in a direction.
  - Engineer crosses out icon in movement direction's area.
  - Engineer attempts another cross-out, is denied.
  - Captain attempts to move in valid direction, is denied.
  - XO charges a guage.
  - Captain attempts to move again, is no longer denied.

Q: Is pausing within the game a part of outer flow, or inner flow?
R: Knowing "current state" is different than knowing "in-game state".
C: In-game and "current" states are represented separately.

Q: How do I represent actions that pause the entire game, as opposed to actions that only pause on team?
R: Each sub must have its own state, which is different from in-game state.

R: This flow of captain action depends on engineering, CO, and XO.
R: That means I need to know how the map and the engineering diagrams get represented.
R: That also means I need to represent all the possible outcomes of engineer crossing things out.
R: That, in turn, means I need to represent winning a game correctly.

Q: How do I send this class over JSON?
R: I can use stringify, etc. to do that.
Q: How do I cast it to the correct type once on the other side?
R: I can create a constructor taking in the raw JSON version of my object and use that.

Q: What should I do with the limited time I have left?
R: I should just outline the different flows.

C: Each action should have its own associated state data for each different kind of state.
C: For actions that affect both submarines, there is a higher-level in-game state.

C: The existing EngineLayoutGenerator doesn't provide a representation of what things are marked off, and what things are not.
R: I could augment it in some way. I could also use custom data representation, and map to/from on client side.

Step 1: add the standard board as a grid.
- API should reflect sectors/rows/cols as necessary for sending coordinates.
Step 2: augment the engine layout so it can handle being marked off.
- Might have to refactor some of the code so that the representation is easier to work with.

## Testing

I would like tests to test the actual protocol interactions, as written/specified on client and server.

Here's how I'm thinking of structuring the code to accomplish this. It will allow testing and development of the protocol in isolation from the client. Then the client can be switched over to different parts of the protocol as the client supports different stages of the game.

// Server code files

function createServerGameState() {
  return {
    // initial server game state here. might not be same as client.
  };
}

// Key constraint on this code is that the gameState object itself is never reassigned. The variables inside might be reassigned, but the object itself might not be.
function createAndRunServer(port, gameState) {
  // create server on port
  // listen on socket, updating gameState as necessary.
}

// Test files

function TestSetDisplayName() {
  test('asserts true', () => {
    const serverGameState = createServerGameState();
    const server = createAndRunServer(3000, serverGameState);
    
    const clientSocket = io("http://localhost:3000");

    // send some things on clientSocket.
    clientSocket.emit("set-name", "Display Name");

    // assert 
    expect(serverGameState.players[0].name).toBe('Display Name');
  });
}
