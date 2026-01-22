# Client-Server Protocol

To deal with user actions being transmitted to the server in real time and by multiple clients, I'd like to adhere to some constraints that help mitigate coordination issues between client and server.
* Server keeps all game state, and transmits any changes to the clients.
* Clients can send messages to the server indicating that an action was performed--but the client state should NOT actually be updated unless the server transmits the relevant change back to the client. (I.e., client UI and state is pessimistic.)

This specifically makes it easy to implement and enforce various kinds of interrupts (global interrupts for game-wide halts, per-submarine states for team-specific conditions like surfacing). This also avoids synchronization issues due to optimistic client updates, like a slower client sending an action just after an interrupt, but before the client has received the interrupt notification from the server.

The game may be slightly slower than it would be with an optimistic client--but not by much, and it makes state management much MUCH easier. (If it's too slow, we can always change it later. I'd rather err on the side of easier-to-develop than fast-but-complicated.)

## State Management

State is managed separately across layers:
- Global phase: LOBBY, LIVE, INTERRUPT, GAME_OVER (handled by gamePhaseManager.js).
- Simulation clock: RUNNING or FROZEN (handled by simulationClock.js; only InterruptManager controls stop/start).
- Per-submarine states: SURFACING, SUBMERGED, etc. (handled by SubmarineStateMachine.js; freezes own sub's movement but allows attacks, damage, broadcasts).

The protocol refactor aligns with InterruptManager (coordinates interrupts), PhaseManager (global phases), and per-sub FSM (SubmarineStateMachine) for accuracy.

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
      * It sets phase to "game beginning".
      * It sends "state" update with phase "GAME_BEGINNING" to all clients.
      * Clients receive "GAME_BEGINNING" and transition to their respective scenes based on role:
        * Captain (co) -> connScene
        * First Officer (xo) -> xoScene
        * Engineer (eng) -> engineScene
      * Server uses setTimeout(3000, () => {...logic goes here...}) to do the following things:
        * It transitions to INTERRUPT phase with type START_POSITIONS.
        * It sends "state" update with INTERRUPT phase and type START_POSITIONS to all clients.
* Captains select locations, and the action starts.
* When all captains have selected positions, the START_POSITIONS interrupt is resolved and the phase transitions to LIVE. (See section on in-game protocol for details.)
* During the game, captain requests pause (manual button via connController).
  * Client (captain) sends "request_interrupt" with type PAUSE to server (routed via InterruptController.js API).
  * If game not already in INTERRUPT phase and player is captain, then InterruptManager triggers out-of-game interrupt (PAUSE). Phase changes to INTERRUPT; clock freezes.
  * Server sends "interrupt_started" with type PAUSE and payload (e.g., overlay instructions) to all clients.
  * Clients display pause overlay with ready-up UI.
* User selects "ready" from interrupt screen.
  * Client sends "ready" to server.
  * Server receives "ready" message.
    * InterruptRoster marks player as ready.
    * If all roles on all subs marked as ready (InterruptRoster.allPlayersReady()), then InterruptManager resolves interrupt; phase sets to LIVE; clock resumes.
    * Server sends "interrupt_resolved" and "resume_game" to all clients.
* During the game, a player's WebSocket connection is broken and/or closed, and it's detected by the server.
  * InterruptManager triggers out-of-game interrupt (PLAYER_DISCONNECT); phase to INTERRUPT; clock freezes.
  * InterruptRoster tracks disconnected players.
  * Server sends "interrupt_started" with type PLAYER_DISCONNECT and roster payload to all clients.
  * Server sends "lobby_state" with updated player data (disconnected player missing from that data).
* Player who got disconnected then refreshes to go back into website, clicks Play, selects available team/role, and clicks "ready".
  * (See above for everything before player clicks "ready".)
  * Client sends "ready" to the server.
  * Server updates InterruptRoster (markReconnected, setRole, setReady).
  * Server sends "lobby_state" to all clients with updated player data.
  * Server sends "begin_game" to newly-ready client, with current game state.
* Once InterruptRoster.allPlayersReady() (all connected, roles assigned, ready), interrupt resolves; phase to LIVE; clock resumes. (See earlier description for details.)
* Sometime later in the game, a win state is achieved by one team or the other.
  * When this win state occurs, the server sends "game_over" with information about winner, to all players.
  * Server sets phase to GAME_OVER.
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

XO can activate Sonar or Drone.

Note: the pause request that the captain can execute is routed via InterruptController to InterruptManager.

* Choose a starting location.
  - All players join the server, select roles, indicate ready, and game begins in INTERRUPT phase.
  - Non-Captain Players are presented with a screen saying "waiting for captains to select starting positions".
  - Captains given appropriate MAP UI to select starting locations.
  - Captains confirm selections.
  - Server triggers a "3,2,1 Dive! Dive!" stylized countdown (with appropriate rendered graphics).
  - COs/XOs/Engineers are now able to perform actions.

Live Gameplay Loop:
  1. CO requests move.
   - Server validates move. Certain Map situations may present no valid moves. (Server must track past positions and orthogonally adjacent positions to validate moves.)
   - If valid, server updates game state.
   - Server sends "game_state" to all clients.

* Captain moves the ship in a valid direction:
  2. XO/Engineers must complete their mandatory move actions.
   - Engineers must cross out icon in movement direction's area.
   - XO must charge a subsystem gauge. (If any gauges not full, XO must charge one. Else: skip.)
   - Server validates, checks for Engineering damage effects, and sends "game_state" to all clients.
  3. COs/XOs are now able to perform optional subsystem actions.
   - If Engineer attempts cross-out, is denied.
   - If XO attempts charge, is denied.
   - These actions can be disabled via controller/UI.
   - If captain moves before a subsystem is activated, return immediately to step 1.

* If Captain moves the ship in an invalid direction, is denied.
  - Display game message with reason. If no available move, display "Must surface", or similar message.
  - Captain attempts to move again.


* In-game actions triggering interrupts (e.g., torpedo fire, sonar ping, scenario action).
  - Client sends action (e.g., "fire_torpedo").
  - Server validates; if triggers interrupt, InterruptManager requests in-game interrupt (e.g., TORPEDO_RESOLUTION); phase to INTERRUPT; clock freezes.
  - Server sends "interrupt_started" with type (e.g., TORPEDO_RESOLUTION), payload, and timer.
  - Clients display appropriate visuals (e.g., resolution overlay).
  - After timer (InterruptTimers.js), interrupt auto-resolves; phase to LIVE; clock resumes.
  - Server sends "interrupt_resolved" to all clients.

* Surfacing (per-submarine).
  - Triggered by action or blackout.
  - Server transitions SubmarineStateMachine for that sub to SURFACING (freezes movement for that sub; allows attacks).
  - Server sends "sub_state_changed" with sub ID and new state to all clients.
  - Clients update UI (e.g., that sub's actions gated via facade: canMove() false).
  - On resolution (e.g., track erasure), transition back to SUBMERGED; send update.

Q: Is interrupting within the game a part of outer flow, or inner flow?
R: Knowing "current phase" is different than knowing "in-game state".
C: In-game and "current" states are represented separately.

Q: How do I represent actions that interrupt the entire game, as opposed to actions that only affect one sub?
R: Each sub has its own state machine, distinct from global phase/interrupts.

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
C: For actions that affect both submarines, there is a higher-level global interrupt.

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