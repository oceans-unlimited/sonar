# Captain Role: Game Logic & Communication Events

This document outlines the server-side logic and Socket.io communications specifically pertaining to the **Captain** (Conn) role, as derived from the `src/` and `public/js/` directories.

## 1. Core State & Data Structures

The Captain's state is primarily managed within the `submarine` object and the global `board` state:

*   **`submarine.co`**: The Player ID currently assigned to the Captain role.
*   **`submarine.row` / `submarine.col`**: The current coordinates of the submarine on the grid.
*   **`submarine.past_track`**: An array of `{ row, col }` tracking every position visited since last surfacing.
*   **`submarine.submarineState`**: Tracks vessel phase: `SUBMERGED`, `MOVED`, `SURFACING`, `SURFACED`, or `DESTROYED`.
*   **`submarine.submarineStateData.MOVED.directionMoved`**: Tracks the last direction the Captain moved (N, S, E, W) to lock the Engineer/XO views appropriately.
*   **`submarine.health`**: Remaining hull integrity (starting at 4).

---

## 2. In-Game Events (Live Phase)

### `move`
*   **Trigger**: Captain clicks a direction button (N, S, E, W) on the Helm (sent via `connController.js` and `MapSystem`).
*   **Payload**: `direction` (e.g., 'N')
*   **Logic (Server-side)**:
    1.  **Validation**: Submarine must be in `SUBMERGED` state.
    2.  **Validation**: New coordinates must be within board bounds.
    3.  **Validation**: New coordinates must be `WATER` (value `0`), not `LAND` (value `1`).
    4.  **Validation**: New coordinates must not exist in `submarine.past_track` (cannot cross own path).
    5.  **Action**: Updates `row`/`col`, pushes new position to `past_track`.
    6.  **State Transition**: Changes `submarineState` to `MOVED`. This locks movement until the Engineer and XO complete their tasks.

### `request_pause`
*   **Trigger**: Captain clicks the "Pause" button in the Vessel system row.
*   **Logic**:
    1.  **Validation**: Global phase must be `LIVE`.
    2.  **Action**: Sets global phase to `INTERRUPT` and `activeInterrupt.type` to `PAUSE`. This halts the `simulationClock` for all players.

### `surface`
*   **Trigger**: Captain initiates surfacing procedure.
*   **Logic**:
    1.  **Validation**: Submarine must be `SUBMERGED`.
    2.  **Action**: Sets state to `SURFACING`. Initiates the role-based task sequence for the crew.

### `silence`
*   **Trigger**: Captain activates the Silence system (requires 5 charges).
*   **Payload**: `{ direction, spaces }`
*   **Logic**:
    1.  Allows the Captain to move up to 4 spaces in a straight line without showing the path to the enemy.
    2.  Updates `past_track` for all spaces moved.
    3.  Transition state to `MOVED` (triggers Engineer/XO tasks).

---

## 3. Interrupt-Specific Events

### `choose_initial_position`
*   **Trigger**: Captain clicks a starting tile during the `START_POSITIONS` interrupt phase.
*   **Payload**: `{ row, column }`
*   **Logic**:
    1.  **Validation**: Position must be `WATER`.
    2.  **Action**: Sets initial `row`/`col`. Once both captains have chosen, the game resumes to `LIVE`.

### `ready_interrupt`
*   **Trigger**: Captain clicks "Ready" during a Pause, Damage Resolution, or Sonar Resolution phase.
*   **Logic**: Signals the server that the Captain is ready. When the `ready` array contains all required Player IDs, the game phase returns to `LIVE`.

### `submit_sonar_response`
*   **Trigger**: During a `SONAR_PING` interrupt, the Captain must provide requested data.
*   **Payload**: `response` (e.g., "ROW 4, SECTOR 2")
*   **Logic**: Updates the interrupt payload. Once submitted, the interrupt resolves and the game resumes.

---

## 4. Navigation Constraints (Local Logic)

The `ConnController` calculates button availability locally before sending events:
1.  **No Reversal**: Cannot move in the exact opposite direction of the previous move.
2.  **Obstacle Detection**: Buttons are disabled if the target tile is Land or Out of Bounds.
3.  **Path Detection**: Buttons are disabled if the target tile is in `pastTrack`.
4.  **State Check**: Helm is disabled unless `submarineState === 'SUBMERGED'` and global phase is `LIVE`.

---

## 5. Out-of-Game / Lobby

### `select_role`
*   **Payload**: `{ submarine: [0|1], role: 'co' }`
*   **Logic**: Assigns the player as the Captain of Submarine A or B.

### `ready`
*   **Logic**: When the Captain (and all other roles) clicks ready in the lobby, the `startGame` sequence begins.
