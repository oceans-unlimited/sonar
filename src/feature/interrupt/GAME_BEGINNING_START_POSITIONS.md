# Submarine Initialization: GAME_BEGINNING & START_POSITIONS

The server initializes the submarine's starting location through a structured sequence involving the `GAME_BEGINNING` phase and the `START_POSITIONS` interrupt. This process ensures all vessels are legally placed before real-time play begins.

## 1. Initial State (Placeholder)
When a submarine object is first instantiated in the lobby, it is assigned a default position of **(0, 0)**. This is merely a placeholder and is not intended for gameplay.

## 2. The `START_POSITIONS` Interrupt
Starting location selection does not happen in the lobby. Instead, once all players are "Ready," the server transitions through a `GAME_BEGINNING` phase into a specific **INTERRUPT** phase of type `START_POSITIONS`. This pause handles the transition from lobby logic to board logic and ensures that no other game actions (like movement or firing) can occur until the map is initialized.

## 3. Validation & Choice (`choose_initial_position`)
The Captain (player assigned to the `co` role) sends the chosen coordinates to the server. The server performs the following checks before accepting the position:
*   **Role Check**: Only the Captain (`co`) of a specific submarine can set its starting point.
*   **Terrain Validation**: The selected coordinates **must be WATER**. If a Captain clicks a LAND tile, the server rejects the selection.
*   **Bounds Check**: The coordinates must exist within the current board dimensions.

## 4. Transition to Live Play
The server tracks which submarines have completed their selection. Once **all** submarines have valid starting positions:
*   The server waits for a short duration (typically 3 seconds).
*   It calls `resumeFromInterrupt()`, which clears the interrupt state.
*   The game phase shifts to `LIVE`, and the submarines are now officially "spawned" at their chosen locations.

## Key Logic Locations

| Component | Responsibility |
| :--- | :--- |
| **`logical-server.lib.js`** | `chooseInitialPosition()`: Handles bounds/terrain validation and state updates. |
| **`server.lib.js`** | `socket.on("choose_initial_position")`: Entry point for the Captain's request and triggers the state broadcast. |
| **`board-layout.lib.js`** | Provides the `WATER`/`LAND` constants used for terrain validation. |
