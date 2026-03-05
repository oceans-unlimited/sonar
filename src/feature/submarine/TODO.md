# TODO: Submarine Feature Implementation

This list tracks the implementation of the Submarine Feature as the canonical "Data Normalizer & View Model" for the project.

## Phase 1: Core Logical Framework
- [x] **Create `SubmarineState.js` (The View Model)**
    - [x] Implement class for single submarine instances (Sub A/B).
    - [x] Add transition validation logic (SUBMERGED -> MOVED, etc.).
    - [x] Implement data normalization (ingesting raw server JSON).
    - [x] Add computed logic: `canMove()`, `canFire()`, `isSurfaced()`.
    - [ ] Implement map queries: `getSquareData()`, `isInPastTrack()`, `isValidMove()`.
- [x] **Create `submarine.js` (The Persistent Service)**
    - [x] Implement singleton to manage the life of submarine states.
    - [x] Subscribe to `socketManager` for `stateUpdate` events.
    - [x] Maintain registry of `SubmarineState` instances.
    - [x] Emit local high-signal events (e.g., `sub:moved`, `sub:damaged`).
- [x] **Create `submarineTransitions.js`**
    - [x] Define the canonical legal transition map.

## Phase 2: Refactoring & Integration
- [ ] **Refactor `SubmarineController.js` (The Facade)**
    - [ ] Transform into the safe interface/bridge for Scene Controllers.
- [ ] **Update `src/core/sceneManager.js`**
    - [ ] Instantiate `Submarine` feature during app initialization.
    - [ ] Inject feature registry into all scene controllers.
- [ ] **Update Scene Controllers**
    - [ ] Migrate `ConnController`, `EngineerController`, and `XOController` to listen to the Submarine Feature instead of the raw socket.

## Phase 3: Validation & Rules
- [ ] **Create `surfacingRules.js`**
    - [ ] Implement pure functions for track erasure and sector calculation.
- [ ] **Create `game_loop_sim.js` (Scenario)**
    - [ ] Automate a full movement cycle to verify gating logic (`canMove()`).
