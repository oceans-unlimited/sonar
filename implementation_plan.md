# Client-Side Production Test Gaps Plan

This plan addresses the Client-Side gaps outlined in `.plans/PRODUCTION_TEST_GAPS.md`, updated with feedback regarding existing features, scenario-based verification, and testing shortcuts.

## User Review Required

Please review the revised plan. I have removed the Open Questions as you have provided clear direction on how to handle surfacing logic, damage coordination, and the teletype sync pattern. Let me know if there are any further refinements before implementation.

---

## Proposed Changes

### Milestone 1: Stability & Interaction Guards
These gaps focus on stopping race conditions or duplicate interactions while the client awaits server resolution.

#### [MODIFY] EngineerController.js
- Update logic inside `updateEngineView(state, sub)` in `EngineerController` to evaluate `sub.getStateData('MOVED')?.engineerCrossedOutSystem`.
- **Purpose:** By reading from the `submarine` data object instead of only relying on the `sub.getState() === 'MOVED'` transition, the controller will accurately lock the engine slots when the engineer completes their task (preventing "ghost" actions while waiting for the XO to finish).

### Milestone 2: UI Parity & Feedback Sync
Ensures players are properly informed of game state, standardizes the Teletype event stream, and mitigates UI confusion.

#### [MODIFY] ConnController.js
- Add visual feedback when the submarine state transitions to `MOVED` and the Captain's helm buttons are locked.
- Provide clear context to the Captain (e.g., via Teletype messages).

#### [MODIFY] Teletype Sync Pattern
- Audit high-signal atmosphere messages (e.g. "Silent running offline" or "Awaiting crew") that are currently triggered directly by local controller actions.
- **Purpose:** Route these through the Teletype system. The Teletype must only listen to `submarine` data object changes for submarine-related events (outputting role-filtered flavor text), and listen to interrupt/game-phase state updates for global events.

### Milestone 3: Client Visual Loop Reset Features
Addresses Phase 3/3.5 items related to the long-term consequences of movement and breakdown. 

#### [MODIFY] Engine Breakdown / Damage Coordination
- Integrate the existing `damage` feature (which handles red tinting/screen shake) with the `EngineerController` breakdown logic.
- Coordinate the two primary damage scenarios: (1) Cross-out of all systems within a single direction, and (2) Cross-out of all 6 reactor systems. When the `sub:engineUpdated` event detects a board reset, we will trigger the global damage visual updates.

#### [MODIFY] Surfacing Visual Reset & Minigame Short-Circuit
- Integrate `surfacingRules.js` logic on the client.
- **Short-circuit:** For initial testing, short-circuit the surfacing minigame with an automatic success loop (`complete_surfacing_task`) for each crew member in sequence, leading directly to the `SURFACED` state resolution.
- Erase visual map tracks and reset appropriate UI elements when the submarine actually reaches `SURFACED`.

---

## Verification Plan

Ensure all functionality is tested through Director scenarios and built properly. 

### Automated Tests
- Run `npm run build` to verify no syntactic or compilation errors are introduced.

### Manual Verification (User-Executed)
- **Scenarios:** Update existing debug scenarios for each milestone (or create and register new ones if none exist).
- **Milestone 1:** Start a scenario with a `MOVED` state but `engineerCrossedOutSystem: true` to ensure the engineer slots load into a locked configuration while waiting on the XO.
- **Milestone 2:** Start a `MOVED` scenario to verify the Captain sees the correct role-filtered Teletype updates without duplicate local triggers.
- **Milestone 3 (Damage/Surfacing):** Load a scenario one action away from an engine breakdown to verify screen shake/tinting. Load a surfacing scenario to verify the automated minigame bypass resolves the interrupt and wipes the tactical map cleanly.
