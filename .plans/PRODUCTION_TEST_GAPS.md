# Production Test Gaps: Basic Movement Loop

This document tracks the outstanding development items and logical gaps that must be addressed before conducting a live production-side test of the basic movement loop (**Captain Move → XO Charge → Engineer Cross-off**).

## 1. Critical Server-Side Gaps (logical-server.lib.js)

### [ ] State Reset Inconsistency in `chargeGauge`
While `crossOffSystem` correctly resets the `xoChargedGauge` and `engineerCrossedOutSystem` flags when transitioning a submarine back to `SUBMERGED`, the `chargeGauge` method **fails to do so**. If the XO is the final player to complete their task, the flags remain `true` until the next move, which may cause UI desyncs or "double-locked" states in the next cycle.

### [ ] START_POSITIONS "Ready" Flow
The server currently auto-resolves the `START_POSITIONS` interrupt as soon as both Captains pick a coordinate. 
- **Requirement:** Implement a two-step flow (Select Tile → Click Ready Toggle) to prevent the game from starting abruptly.
- **Status:** Documented as "Deferred" in `next_steps.md`.

### [ ] Post-Start Legal Move Validation
The server lacks a check to ensure that the initial positions chosen by Captains actually allow for valid movement (e.g., not placed in a corner surrounded by islands).
- **Requirement:** Add a validation step to `chooseInitialPosition` or a post-selection check to ensure at least one cardinal direction is clear.

---

## 2. Client-Side Controller & UI Gaps

### [x] Engineer Interaction Guard *(Resolved: April 20, 2026)*
The `EngineerController.js` now checks **both** `sub.getState() === 'MOVED'` and `!movedData?.engineerCrossedOutSystem` in `updateEngineView()`. This prevents duplicate cross-off actions while the XO is still completing their task.
- **Director Scenario:** `engineer/10_interaction_guard.js` verifies the locked state.

### [x] Captain "Awaiting Crew" Feedback *(Resolved: April 20, 2026)*
Feedback is now provided through the **Teletype** system rather than a dedicated visual overlay, since locked buttons already communicate the state visually.
- **Implementation:** `TeletypeTranslator.js` contains a `SUB_STATE_MOVED` entry that emits role-filtered messages:
  - Captain: `"> [HELM] Heading {dir} confirmed. Awaiting crew confirmation..."`
  - Engineer: `"> [ENG] Cross-off required: {dir} systems."`
  - XO: `"> [XO] Charge a subsystem gauge."`

### [x] Teletype Event Synchronization *(Resolved: April 20, 2026)*
The `TeletypeController` now subscribes to the submarine singleton's `submarine:stateChanged` event (feature-to-feature pattern, matching `DamageController`). All submarine state transitions (`MOVED`, `SUBMERGED`, `SURFACING`, `SURFACED`, `DESTROYED`) produce role-filtered flavor text through `TeletypeTranslator.js`.
- **Pattern:** Submarine-related events → listen to submarine data object changes only. Global events (interrupts, phases) → listen to interrupt/phase state updates.
- **Retained local messages:** `ConnController` "Silent running offline" (local action feedback) and `EngineerController` breakdown messages (heuristic from `sub:engineUpdated`) remain as-is since they are action-driven, not state-driven.

---

## 3. Maintenance & Loop Reset (Submarine Feature)

### [x] Surfacing Logic (Track Erasure) — Client Side *(Resolved: April 20, 2026)*
- **Track Erasure Pipeline:** When the server clears `past_track` on surfacing resolution, the submarine feature receives the update, `SubmarineState.update()` applies the empty array, `submarine:allUpdated` fires, and the `MapController` re-renders with the empty track. No additional client code was needed.
- **Surfacing Minigame Short-Circuit:** `SurfaceController` now has an `autoCompleteSurfacing()` method and `AUTO_COMPLETE_SURFACE` handler. This bypasses the tracing minigame by emitting `complete_surfacing_task` for each role in sequence (500ms stagger). Used for initial production testing.
- **Remaining Server Work:** The `completeSurfacingTask` method in `logical-server.lib.js` has a bug — it checks `sub.submarineState !== SUBMERGED` (should check `!== SubmarineStates.SURFACING`). The constant `SUBMERGED` is used instead of `SubmarineStates.SURFACING`. This must be fixed server-side before live surfacing tests.

### [x] Damage System Feedback *(Resolved: April 20, 2026)*
- **Existing Coverage:** The `DamageController` already listens to `submarine:damaged` from the submarine singleton. When the server decrements health on direction/reactor breakdown, the event fires and triggers screen shake (`shake()`) + red tint (`flashDamage()`) + health UI update.
- **Director Scenarios:** `engineer/04_direction_critical.js` (direction breakdown) and `engineer/05_reactor_critical.js` (reactor meltdown) already cover both damage paths with full visual feedback.
- **Future SFX:** Audio effects for damage events are planned but not yet implemented.

---

## 4. Verification Requirements

### [ ] Multi-Client Latency Test
Current verification is heavily reliant on `Director.js` (instant local feedback).
- **Requirement:** Conduct a test using `logical-server.lib.js` with simulated network latency to ensure the `MOVED` state transitions don't result in race conditions between the XO and Engineer.
- **Note:** The new `engineerCrossedOutSystem` guard on the client should significantly reduce the risk of ghost interactions, but the server-side `chargeGauge` reset bug (Section 1) could still cause desyncs.

