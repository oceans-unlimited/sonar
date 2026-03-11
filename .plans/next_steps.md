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

Current work:
- [ ] **Interrupt Overlay**: Refactor to Feature-Owned Renderer + Role Hint architecture.
  - Add `interruptPanelRenderer.js` (stateless, role-aware panel builders).
  - Add `InterruptOverlay` to engineer and XO scenes.
- [ ] **Submarine Singleton Consumption**: Audit role-based scenes to use the `SubmarineController` facade instead of raw server state.
- [ ] **Director Scenarios**: Fix engineer interrupt scenarios (format + registration), create interrupt scenarios for Captain and XO roles.

---

## Future Steps
1.  **DamageSystem Feature**: Track hull health and visual impacts.
2.  **Director Expansion**: Create multi-scene scenarios and assertion-based verification.
3.  **Core Improvements**:
    *   Implement `animators.js` for complex time-based effects (Glow, Pulse).
    *   Integrate persistence for switch states across scene loads.

---
*For big picture architecture, see [GEMINI.md](./GEMINI.md).*
