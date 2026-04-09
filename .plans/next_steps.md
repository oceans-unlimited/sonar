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

## Phase 3.5: Damage State Scenarios [PLANNED]
Develop comprehensive test scenarios for critical game states to ensure Engineer UI feedback handles damage and failure modes correctly.

- [ ] **Circuit Completion**: 
  - Simulate multiple turns to verify circuit completion logic (clearing slots).
  - Verify interaction with the mocked server logic.
- [ ] **Direction Critical**:
  - Simulate a state where all slots in one direction are crossed out.
  - Verify `1 Damage` feedback and board reset (if applicable per rules).
- [ ] **Reactor Critical**:
  - Simulate failure of all reactor systems.
  - Verify "Reactor Breakdown" state and visual consequences.

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

## Future Steps
1.  **DamageSystem Feature**: Track hull health and visual impacts.
2.  **Director Expansion**: Create multi-scene scenarios and assertion-based verification.
3.  **Core Improvements**:
    *   Implement `animators.js` for complex time-based effects (Glow, Pulse).
    *   Integrate persistence for switch states across scene loads.

---
*For big picture architecture, see [GEMINI.md](./GEMINI.md).*
