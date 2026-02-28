# Engineer Role: Game Logic & Communication Events

This document outlines the server-side logic and Socket.io communications specifically pertaining to the **Engineer** role, as derived from the `src/` and `public/js/` directories.

## 1. Core State & Data Structures

The Engineer's state is primarily managed within the `submarine` object in the global state:

*   **`submarine.eng`**: The Player ID currently assigned to the Engineer role.
*   **`submarine.engineLayout`**:
    *   `directions`: North, South, East, West mappings of `frameSlots` and `reactorSlots`.
    *   `circuits`: Connections that, when fully crossed out, reset specific slots.
    *   `crossedOutSlots`: An array of `{ direction, slotId }` tracking currently active damage/marks.
*   **`submarine.submarineStateData.MOVED.engineerCrossedOutSystem`**: A boolean flag tracking if the Engineer has performed their mandatory cross-off for the current move.

---

## 2. Engine Layout Initialization

When the game starts (`startGame` in `logical-server.lib.js`), the server generates a unique `engineLayout` for each submarine using the `EngineLayoutGenerator`.

### Generation Process
1.  **System Distribution**: 
    *   **Frame Slots**: Randomly assigns 3 of the 4 systems (stealth, detection, weapons, reactor) to the frame slots of each direction.
    *   **Reactor Slots**: Randomly fills reactor slots with `reactor` or remaining systems (ensuring no more than 2 of any system per direction).
2.  **Circuit Generation**: Creates 3 unique circuits (Blue, Green, Red).
    *   **Connectivity**: Each circuit links exactly 4 frame slots.
    *   **Balance**: Every circuit is guaranteed to connect to at least one of each non-reactor system (stealth, detection, weapons).
3.  **Final Broadcast**: The layout is sent to clients via the initial `stateUpdate` broadcast to render the paths and icons.

---

## 3. Movement Loop Cycle (Engineer Perspective)

| Phase | Actor | Event/Action | State / Payload |
| :--- | :--- | :--- | :--- |
| **1. Movement Initiation** | Captain | `move` (Emit) | **Payload:** `direction` (e.g., `'N'`) |
| **2. State Transition** | Server | `SubmarineStates.MOVED` | **Server Logic:** Updates sub coordinates. Sets `submarineState` to `MOVED`. |
| **3. Global Sync** | Server | `stateUpdate` (Broadcast) | **Payload:** Full `state` object. |
| **4. Interaction Lock** | Engineer (Client) | `update_engine_view` | **Local Logic:** UI locks all panels except the one matching `directionMoved`. |
| **5. Damage Assignment** | Engineer | `cross_off_system` (Emit) | **Payload:** `{ direction: 'N', slotId: 'slot01' }` |
| **6. Verification** | Server | `logicalServer.crossOffSystem` | **Server Logic:** Updates `crossedOutSlots`, sets `engineerCrossedOutSystem = true`. |
| **7. Cycle Resolution** | Server | `SubmarineStates.SUBMERGED` | **Server Logic:** If XO has also finished, state reverts to `SUBMERGED`. |
| **8. Final Sync** | Server | `stateUpdate` (Broadcast) | **Payload:** Full `state` object. UI unlocks for next move. |

---

## 4. Handled Broadcast Messages

The `EngineController` listens for the following server-driven updates to synchronize the UI:

### `stateUpdate` (Socket.io)
*   **Submarine Sync**: Identifies the player's submarine in the global `submarines` array.
*   **Layout Refresh**: Updates the local `engineLayout` (circuit connections and slot mappings).
*   **Button State**: Synchronizes `pushedButtons` (Set) with the server's `crossedOutSlots` to show permanent damage.
*   **Movement Context**: Extracts `directionMoved` during `POST_MOVEMENT` to highlight the active panel.
*   **Health Tracking**: Updates the `hullDamage` display based on `sub.health`.

### `Interrupt Events` (InterruptManager)
*   **`interruptStarted` / `interruptUpdated`**: Triggers the `show_interrupt_overlay` event with role-specific options (e.g., "Ready" vs "Quit").
*   **`interruptEnded`**: Triggers the `hide_interrupt_overlay` event to resume standard gameplay view.

---

## 5. Server-Side Submarine States Summary

*   **`SUBMERGED`**: Default state. Captain can move. Engineer view is "Waiting".
*   **`MOVED` / `POST_MOVEMENT`**: Movement lock. Engineer must cross off a slot in the moved direction.
*   **`SURFACING`**: Repair sequence active. Engineer must complete their surfacing task.
*   **`SURFACED`**: Terminal repair state. All `crossedOutSlots` are cleared.
*   **`DESTROYED`**: Health is 0. Role interaction disabled.

---

## 6. Client-to-Server Emissions (Emits)

### `cross_off_system`
*   **Trigger**: Clicks an active slot during `POST_MOVEMENT`.
*   **Payload**: `{ direction, slotId }`

### `complete_surfacing_task`
*   **Trigger**: Completes mini-game task during `SURFACING`.

### `ready_interrupt`
*   **Trigger**: Clicks "Ready" or "Pause" on an interrupt overlay.

### `leave_role`
*   **Trigger**: Clicks "Quit" or "Abort" on an interrupt overlay.