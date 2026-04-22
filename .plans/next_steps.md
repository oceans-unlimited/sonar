# Implementation Plan - Modular Button System Behavior & Effects

## Status Summary: IN PROGRESS
The Button system has been refactored into a **"Four Pillars"** architecture. Phase 2 (Polymorphic Controllers) is substantially complete.

### Completed Milestones

1. **Mechanical Behavior (Pillar 3)** ***COMPLETED***
2. **Button Grouping & Layouts** ***COMPLETED***
3. **Visual Effects Interface (Pillar 2)** ***COMPLETED***
4. **Integration Layer (Pillar 1 & 4)** ***COMPLETED***

---

## Phase 2: Polymorphic Controller Architecture [COMPLETED]
---

## Phase 3: Director Mode (Test Harness) [COMPLETED]
- [x] **Core Director Infrastructure**: Mock server logic with timeline support.
- [x] **Dynamic Capability**: Support for `run(director)` interactive loops.
- [x] **Debug Overlay**: UI for scenario selection, timeline control, and event injection.
- [x] **Engineer Scenarios**: 
  - [x] `01_pristine`: Basic setup.
  - [x] `02_move_cycle`: Interactive game loop (Captain Move -> Engineer Cross-off -> Submerge).
- [x] **Integration**: Conditional activation via `?mode=test`.

---

## Phase 3.5: Damage State Scenarios [COMPLETED]
Comprehensive test scenarios for critical game states. Damage feature coordinates with `EngineerController` breakdown heuristics. Visual feedback (screen shake, red tint) is fully operational.

- [x] **Circuit Completion**: 
  - Verified via `engineer/03_circuit_near_complete.js`.
  - Circuit repair clears member slots and triggers atmosphere message.
- [x] **Direction Critical**:
  - Verified via `engineer/04_direction_critical.js`.
  - All slots in one direction crossed → 1 Damage → board reset → screen shake + red tint.
- [x] **Reactor Critical**:
  - Verified via `engineer/05_reactor_critical.js`.
  - All 6 reactor slots crossed → 1 Damage → board reset → screen shake + red tint.
- [x] **Damage Feature Integration**:
  - `DamageController` listens to `submarine:damaged` from submarine singleton.
  - `shake()` and `flashDamage()` effects fire on health decrement.
  - `DamageUI` updates health percentage and profile tint.

---

## Phase 4: Architecture Cleanup [COMPLETED]
- [x] Architecture audit and analysis
- [x] Visual architecture deep dive
- [x] Rename files for clarity (Coordinators, Profiles, etc.)
- [x] Create `/feature/` directory structure
- [x] Update architecture documentation

---

## Phase 5: Feature Integration — Interrupt & Submarine [IN PROGRESS]

The Interrupt and Submarine features have been implemented as persistent singletons.
See [interrupt/README.md](../src/feature/interrupt/README.md) and [submarine/README.md](../src/feature/submarine/README.md).

### Completed
- [x] **Submarine Singleton Consumption**: Audit role-based scenes to use the `SubmarineController` facade instead of raw server state. (All major roles migrated)
- [x] **InterruptCoordinator** (replaces InterruptOverlay): Non-visual context swap coordinator.
  - Swaps `normalContent` for interrupt panels inside `swapWrapper`.
  - Discovers containers by standardized labels — no argument passing.
  - Wires universal ready button (`thumb` asset, toggle behavior) and modular status label.
- [x] **START_POSITIONS Interrupt**: End-to-end implementation for all role scenes.
  - Captain (co): Map-driven position selection + ready toggle in control panel swap area.
  - Crew (xo, eng, sonar): "AWAITING CAPTAINS" panel in swap area.
  - Director scenarios created for all 4 roles.
- [x] **Scene Integration**: All role scenes (conn, xo, engineer, sonar) updated to use `InterruptCoordinator`.

### In Progress
- [ ] **Post-Start Validation**: Implement a "Validate Moves" process immediately following the selection of a starting position (START_POSITIONS) to ensure legal moves are immediately available.

### Server Gaps (Documented)
- [ ] **START_POSITIONS Ready Flow**: Server currently auto-resolves when all subs have chosen positions via `chooseInitialPosition`. The desired client behavior is a two-step flow (select → ready toggle) where the server waits for `ready_interrupt` from both captains. Director scenarios currently simulate this desired behavior. Server update deferred.

---

## Phase 5.5: Client-Side Production Test Gaps [COMPLETED]
Addressed all client-side gaps from `PRODUCTION_TEST_GAPS.md`. See that document for full resolution details.

### Milestone 1: Engineer Interaction Guard
- [x] `EngineerController.updateEngineView()` now checks `engineerCrossedOutSystem` from the submarine data object to prevent duplicate cross-off actions.
- [x] Director scenario `engineer/10_interaction_guard.js` created and registered.

### Milestone 2: Teletype State Sync
- [x] `TeletypeTranslator.js` expanded with 5 submarine state transition entries (`SUB_STATE_MOVED`, `SUB_STATE_SUBMERGED`, `SUB_STATE_SURFACING`, `SUB_STATE_SURFACED`, `SUB_STATE_DESTROYED`), each with role-filtered resolvers.
- [x] `TeletypeController` now subscribes to `submarine:stateChanged` via the submarine singleton (feature-to-feature pattern). Cleanup handled in `onSocketUnbound()`.
- [x] Local controller atmosphere messages audited — action-driven messages (e.g., "Silent running offline") intentionally retained.

### Milestone 3: Surfacing Short-Circuit & Damage Confirmation
- [x] `SurfaceController.autoCompleteSurfacing()` added — emits `complete_surfacing_task` for each role in sequence (500ms stagger) to bypass the tracing minigame during testing.
- [x] Track erasure pipeline confirmed: server clears `past_track` → `SubmarineState.update()` → `submarine:allUpdated` → `MapController.refreshVisuals()`.
- [x] Damage feature confirmed operational via existing `04_direction_critical` and `05_reactor_critical` scenarios.

### Discovered Issues (Deferred — Server-Side)
- **`chargeGauge` state reset bug**: When the XO is the last to complete, `engineerCrossedOutSystem` and `xoChargedGauge` flags are not reset before transitioning back to `SUBMERGED`.
- **`completeSurfacingTask` state check bug**: Method checks `sub.submarineState !== SUBMERGED` (undefined constant) instead of `!== SubmarineStates.SURFACING`.

---

## Future Steps
1.  **Server-Side Fixes**: Address `chargeGauge` reset inconsistency and `completeSurfacingTask` state check bug (see `PRODUCTION_TEST_GAPS.md` Section 1 and Section 3).
2.  **Multi-Client Latency Test**: Conduct a live test with `logical-server.lib.js` to verify MOVED state race conditions between XO and Engineer.
3.  **Damage SFX**: Add audio effects for damage events (screen shake and red tint are visual-only currently).
4.  **Director Expansion**: Create multi-scene scenarios and assertion-based verification.
5.  **Core Improvements**:
    *   Implement `animators.js` for complex time-based effects (Glow, Pulse).
    *   Integrate persistence for switch states across scene loads.

---
*For big picture architecture, see [GEMINI.md](./GEMINI.md).*

