# First Officer (XO) Role: Game Logic & Communication Events

This document outlines the server-side logic and Socket.io communications specifically pertaining to the **First Officer** (XO) role, as derived from the `src/` and `public/js/` directories.

## 1. Core State & Data Structures

The First Officer's state is primarily managed within the `submarine` object in the global state:

*   **`submarine.xo`**: The Player ID currently assigned to the First Officer role.
*   **`submarine.actionGauges`**: An object tracking the current charge level of each subsystem:
    *   `mine`: (Max 3)
    *   `torpedo`: (Max 3)
    *   `drone`: (Max 3)
    *   `sonar`: (Max 3)
    *   `silence`: (Max 5)
    *   *Note: Max levels as enforced in `logical-server.lib.js` may slightly differ from UI mock defaults.*
*   **`submarine.submarineStateData.MOVED.xoChargedGauge`**: A boolean flag tracking if the XO has performed their mandatory charge action for the current move.

---

## 2. In-Game Events (Live Phase)

### `charge_gauge`
*   **Trigger**: XO clicks a subsystem row that is not yet full during the post-movement phase.
*   **Payload**: `gauge` (e.g., 'torpedo', 'mine', 'silence')
*   **Logic (Server-side)**:
    1.  **Validation**: Submarine must be in `MOVED` state.
    2.  **Validation**: `xoChargedGauge` must be `false`.
    3.  **Validation**: The requested gauge must not already be at its maximum capacity.
    4.  **Action**: Increments the specific gauge value in `submarine.actionGauges`.
    5.  **State Transition**: If both the XO has charged a gauge AND the Engineer has crossed off a system, the submarine returns to `SUBMERGED` state.

### `discharge_gauge` (System Activation)
*   **Trigger**: XO clicks a subsystem row that has reached its maximum level.
*   **Logic**:
    *   While the UI signals readiness ("READY TO DISCHARGE"), the actual logic for system effects (like firing a torpedo or dropping a mine) is typically initiated by the **Captain**, using the charges the XO has accumulated.
    *   *Note: `xoController.js` contains a stub for `discharge_gauge` which emits a custom socket event.*

---

## 3. Surfacing Sequence

### `surface`
*   **Trigger**: Initiated by Captain.
*   **Logic**: Submarine state changes to `SURFACING`. All `roleTaskCompletion` flags are reset.

### `complete_surfacing_task`
*   **Trigger**: XO completing their specific task during the surfacing mini-game.
*   **Logic**:
    1.  Validates role order (typically `co` -> `xo` -> `eng` -> `sonar`).
    2.  Sets `xo` completed flag to `true`.
    3.  Allows the sequence to progress to the Engineer.

---

## 4. Subsystem Management (Local Logic)

The `XOController` manages visual feedback based on the global state:
*   **Charging Logic**: Gauges can ONLY be charged when the sub is in the `POST_MOVEMENT` state.
*   **Discharge Readiness**: When a gauge reaches its max level, the UI triggers a "Pulse" and "Glow" effect to notify the crew that the system is ready.
*   **Clock Sync**: Gauges and interactions are disabled if the `simulationClock` is paused or the game phase is not `LIVE`.

---

## 5. Out-of-Game / Lobby

### `select_role`
*   **Payload**: `{ submarine: [0|1], role: 'xo' }`
*   **Logic**: Assigns the player to the First Officer slot.

### `ready_interrupt`
*   **Trigger**: Clicking 'Ready' during a Pause or Resolution phase.
*   **Logic**: Signals the server that the XO is ready to resume gameplay.
