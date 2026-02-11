# Engineer Role: Game Logic & Communication Events

This document outlines the server-side logic and Socket.io communications specifically pertaining to the **Engineer** role, and by extension the Engine Scene Renderer(s) and Controller.

## 1. Core State & Data Structures

The Engineer's state is primarily managed within the `submarine` object in the global state:

*   **`submarine.eng`**: The Player ID currently assigned to the Engineer role.
*   **`submarine.engineLayout`**:
    *   `directions`: North, South, East, West mappings of `frameSlots` (circuit frame buttons representing systems) and `reactorSlots` (reactor and system buttons to the left of each direction block).
    *   `circuits`: Connections that, when fully crossed out, reset the 'member' slots. Each circuit has 4 'member' slots.
    *   `crossedOutSlots`: An array of `{ direction, slotId }` tracking currently crossed out slots. This is server provided data represents the round-trip response of the Engineer's cross-off action. When updated, the controller instructs the renderer to update the UI.
*   **`submarine.submarineStateData.MOVED.engineerCrossedOutSystem`**: A server-side boolean flag tracking if the Engineer has performed their mandatory cross-off for the current move.

## 2. Engine Layout Initialization

When the game starts (`startGame` in `logical-server.lib.js`), the server generates a unique `engineLayout` for each submarine using the `EngineLayoutGenerator`.

### Generation Process
1.  **System Distribution**: 
    *   **Frame/Circuit Slots**: Randomly assigns 3 systems (vessel, detection, weapons) to each direction's frame slots.
    *   **Reactor Slots**: Specifically fills `reactorSlots` with `reactor` or remaining systems.
    *   **Reactor Restriction**: There are exactly 6 'reactor' systems total per submarine, exclusively located in `reactorSlots`.
2.  **Circuit Generation**: Creates 3 unique circuits (Blue, Green, Red).
    *   **Connectivity**: Each circuit links exactly 4 frame slots.
    *   **Balance**: Every circuit connects to one of each non-reactor system (vessel, detection, weapons).
3.  **Final Broadcast**: The layout is sent to clients via initial `state` broadcast.

---

## 3. Movement Loop Cycle (Engineer Perspective)

This cycle tracks the flow of information from the Captain's move to the Engineer's damage assignment and back to a submerged state.

| Phase | Actor | Event/Action | State / Payload |
| :--- | :--- | :--- | :--- |
| **1. Movement Initiation** | Captain | `move` (Emit) | **Payload:** `direction` (e.g., `'N'`) |
| **2. State Transition** | Server | `SubmarineStates.MOVED` | **Server Logic:** Updates sub coordinates and track. Sets `submarineState` to `MOVED`. |
| **3. Global Sync** | Server | `state` (Broadcast) | **Payload:** Full `state` object. `sub.submarineState === 'MOVED'`, `sub.submarineStateData.MOVED.directionMoved === 'N'`. |
| **4. Interaction Lock** | Engineer (Client) | `updateEngineView` | **Local Logic:** <br> - **LOCKED (IDLE)**: Wrong direction buttons are visible but non-interactive.<br> - **READY (ACTIVE)**: Correct direction buttons pulse/highlight and accept clicks.<br> - **DONE (DISABLED)**: Already crossed-off buttons appear dimmed/crossed-out. |
| **5. Deactivate (CrossOut) System** | Engineer | `cross_off_system` (Emit) | **Payload:** `{ direction: 'N', slotId: 'slot01' }` |
| **6. Verification** | Server | `logicalServer.crossOffSystem` | **Server Logic:** Validates the move, updates `crossedOutSlots`, sets `engineerCrossedOutSystem = true`. |
| **7. Cycle Resolution** | Server | `SubmarineStates.SUBMERGED` | **Server Logic:** If `xoChargedGauge` is also `true`, state reverts to `SUBMERGED`. |
| **8. Final Sync** | Server | `state` (Broadcast) | **Payload:** Full `state` object. `sub.submarineState === 'SUBMERGED'`. |

---

## 4. Server-Side Submarine States Summary

*   **`SUBMERGED`**: The default operating state. Movement is enabled for the Captain.
*   **`MOVED`**: Intermediate state triggered after the Captain moves. Interaction is disabled for the Captain; enabled for the Engineer (Damage) and First Officer (Charge).
*   **`SURFACING`**: Triggered when the Captain initiates a surface. Submarine is immobile and vulnerable while crew completes mini-game tasks.
*   **`SURFACED`**: Terminal state of surfacing. All damage is repaired. Submarine must manually `submerge` to resume play.
*   **`DESTROYED`**: Submarine health reached 0. Game Over condition.

---

## 5. In-Game Events (Live Phase)

### `cross_off_system`
*   **Trigger**: Engineer clicks a system slot on their panel (sent via `engineController.js`).
*   **Payload**: `{ direction, slotId }`
*   **Logic (Server-side)**:
    1.  **Validation**: Submarine must be in `MOVED` state.
    2.  **Validation**: `engineerCrossedOutSystem` must be `false`.
    3.  **Validation**: The `direction` of the slot must match the `directionMoved` of the submarine.
    4.  **Action**: Adds the slot to `engineLayout.crossedOutSlots`.
    5.  **State Transition**: If both the Engineer has crossed off a system AND the First Officer (XO) has charged a gauge, the submarine returns to `SUBMERGED` state.
    6.  **Consequence - Circuit Completion**: If all slots in a defined circuit are crossed out, those specific slots are cleared (repaired).
    7.  **Consequence - Breakdown**:
        *   **Direction Breakdown**: If all slots (frame + reactor) in a single direction are crossed out, the sub takes **1 Damage** and all slots on the layout are cleared.
        *   **Reactor Breakdown**: If all slots marked as 'reactor' across the entire board are crossed out, the sub takes **1 Damage** and all slots on the layout are cleared.
        *  Note: damage is managed for each submarine by the damage feature. It is propogated to all crew members for feedback.

---

## 6. Surfacing Sequence

### `surface`
*   **Trigger**: Triggered by Captain, but impacts Engineer UI.
*   **Logic**: Submarine state changes to `SURFACING`. All `roleTaskCompletion` flags are reset.

### `complete_surfacing_task`
*   **Trigger**: Engineer completing their specific task during the surfacing mini-game.
*   **Logic**:
    1.  Validates role order (typically `co` -> `xo` -> `eng` -> `sonar`).
    2.  Sets `eng` completed flag to `true`.
    3.  If the Engineer is the final task (or sequence is finished), the sub state changes to `SURFACED`, and **all Engineer crossed-off slots are cleared**.

---

## 7. Interrupts & General Logic

### `ready_interrupt`
*   **Trigger**: Clicking 'Ready' during a game-pause or resolution phase (e.g., Torpedo Resolution).
*   **Logic**: Adds the Engineer's Player ID to the `ready` list. When all required roles are ready, the game resumes from `INTERRUPT` to `LIVE`.

### `state` (Broadcast)
*   **Direction**: Server -> Client
*   **Impact**:
    *   Updates the local `pushedButtons` set to sync with the server's `crossedOutSlots`.
    *   Determines if buttons are clickable based on `submarineState` and `directionMoved`.
    *   Updates `hullDamage` (health) display.

---

## 8. Out-of-Game / Lobby

### `select_role`
*   **Payload**: `{ submarine: [0|1], role: 'eng' }`
*   **Logic**: Assigns the player to the Engineer slot of the chosen submarine.

### `leave_role`
*   **Trigger**: Engineer quits or exits to lobby.
*   **Logic**: Removes the Player ID from the `submarine.eng` field and the `ready` list.