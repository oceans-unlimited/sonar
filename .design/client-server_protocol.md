# Client-Server Protocol

To deal with user actions being transmitted to the server in real time and by multiple clients, I'd like to adhere to some constraints that help mitigate coordination issues between client and server.
* Server keeps all game state, and transmits any changes to the clients.
* Clients can send messages to the server indicating that an action was performed--but the client state should NOT actually be updated unless the server transmits the relevant change back to the client. (I.e., client UI and state is pessimistic.)

This specifically makes it easy to implement and enforce various kinds of pauses (game-wide pause, captain-specific pauses for certain actions, etc.). This also avoids synchronization issues due to optimistic client updates, like a slower client sending an action just after a pause, but before the client has received the pause notification from the server.

The game may be slightly slower than it would be with an optimistic client--but not by much, and it makes state management much MUCH easier. (If it's too slow, we can always change it later. I'd rather err on the side of easier-to-develop than fast-but-complicated.)

## Out-of-Game Protocol Outline

There are two sets of messages: client-to-server, and server-to-client. Each of these will be outlined for each area of functionality.

### Initial Connection and Re-Connection

* Server-to-client:
  - user_joined { clientId, displayName }: When a client initially connects or re-connects and has been assigned a clientId, this message is broadcast to all clients.
  - display_name_changed {clientId, newDisplayName }: A client can change their display name, and this notifies all clients of that change so the displays can be updated.
  - user_connection_lost { clientId }: WebSocket connection with client is completely disrupted/disconnected and/or client fails to acknowledge second-to-second ping for 5 seconds.
  - team_selected { clientId, team }: A user has selected a team.
  - role_selected { clientId, role }: A user has selected a role and team.
  - player_is_ready { clientId }: User indicated "ready".
  - game_countdown_begin { }: sent when all players are "ready" and all roles on all teams are filled.
  - game_started { }: All players have marked "ready" and the countdown is complete; game has started!

TODO: fill in rest of this from written notes.
