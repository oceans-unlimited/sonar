REALTIME ENGINE

Top-level systems
1. Simulation Clock / Phase System
2. Global Interrupt System
3. Per-Submarine State Machine

"Pause" (manual UI button) is a global interrupt (#2)
"Surfacing" is per-submarine state (#3)

1. Simulation Clock / Phase System
Location: src/core/clock/

Files:
- simulationClock.js
  - Owns RUNNING / FROZEN state
  - start(), stop(), isRunning()
  - Emits events
  - No rendering, no animation
  - Controllers query before time-sensitive actions

- gamePhaseManager.js
  - Owns phases: LOBBY, LIVE, INTERRUPT, GAME_OVER
  - setPhase(), getPhase()
  - Validates transitions
  - Emits events
  - Controllers / sceneManager query for gating

- clockEvents.js
  - Canonical event names (CLOCK_START, CLOCK_STOP, PHASE_CHANGE)

Integration:
- src/core/sceneManager.js → uses gamePhaseManager for scene mounting (routed by player role during in-game phases)
- src/control/* → check simulationClock.isRunning() before actions
- src/feature/map/mapController.js → pauses updates via clock state

2. Global Interrupt System
Location: src/feature/interrupt/

Purpose: Temporary global halt for game events
- In-game interrupts: Auto-resume after resolution (torpedo, sonar, scenario)
- Out-of-game interrupts: Require all-player ready-up (manual pause, disconnect)

Files:
- InterruptManager.js
  - Central coordinator
  - Tracks active interrupt (type, payload, timer)
  - requestInterrupt(type, payload)
  - resolveInterrupt(type)
  - Emits: interruptStarted, interruptResolved, interruptEnded
  - Requests phase change to INTERRUPT / LIVE via gamePhaseManager
  - ONLY system allowed to call simulationClock.stop()/start()

- InterruptTypes.js
  - **In-game interrupts** (auto-resume via InterruptTimers):
    - WEAPON_RESOLUTION
    - SONAR_PING
    - SCENARIO_ACTION
    - START_POSITIONS (triggered at game start; resolved when captains choose positions)
  - **Out-of-game interrupts** (require all-player ready-up):
    - PAUSE (manual button via connController)
    - PLAYER_DISCONNECT (tracks roster of disconnected players)
  - (GAME_OVER is a phase, not an interrupt)

- InterruptController.js
  - API for controllers to request interrupts
  - Translates intent → requestInterrupt()

- InterruptRoster.js
  - Tracks player connection status, role assignment, ready state
  - Used by PLAYER_DISCONNECT and PAUSE interrupts
  - Methods: markDisconnected(), markReconnected(), setRole(), setReady(), allPlayersReady()
  - Emits roster update events for UI

- InterruptTimers.js
  - Duration, delays, auto-resume logic
  - Only applies to in-game interrupts (WEAPON_RESOLUTION, SONAR_PING, SCENARIO_ACTION)
  - Out-of-game interrupts (PAUSE, PLAYER_DISCONNECT) have no timer

Integration:
- src/core/socketManager.js → Controller → InterruptController → InterruptManager
- src/scenes/* → React visually to interrupt events via controller bridge
- src/render/effects/ → Interrupt visuals (cinematics, overlays)

Rules:
- InterruptManager is the only mediator for halting/resuming simulationClock
- Two interrupt categories:
  - **In-game interrupts**: Auto-resume after resolution (TORPEDO_RESOLUTION, SONAR_PING, SCENARIO_ACTION)
  - **Out-of-game interrupts**: Require all-player ready-up (PAUSE, PLAYER_DISCONNECT)
- Interrupt precedence:
  - In-game interrupts complete first, then out-of-game interrupts activate
  - Example: torpedo mid-resolution + disconnect → torpedo completes, then PLAYER_DISCONNECT triggers
- PAUSE interrupt (manual):
  - Triggered by captain pressing pause button in connController
  - Administrative halt (bathroom break, discussion)
  - Requires all players to ready-up to resume
  - Handled identically to PLAYER_DISCONNECT in terms of resolution flow
- PLAYER_DISCONNECT interrupt:
  - Detected via src/core/socketManager.js disconnect event(s)
  - Single interrupt tracks roster of ALL disconnected players
  - Roster maintains: connection status, role assignment, ready state
  - Disconnected players reconnect → lobby scene → select role → ready-up
  - Requires: ALL players connected + assigned to roles + all ready
  - Only then can InterruptManager.resolveInterrupt(PLAYER_DISCONNECT) be called
  - Transitions game to out-of-game pause phase (via gamePhaseManager)
- No other feature/controller touches clock directly

3. Submarine State (Data Normalizer & View Model)
Location: src/feature/submarine/

Purpose: High-signal data provider for UI components. Acts as a View Model between raw server JSON and the Scene Controllers.

Files:
- SubmarineFeature.js
  - Persistent application-level service.
  - Subscribes to socketManager 'stateUpdate'.
  - Maintains registry of SubmarineState objects (Sub A, Sub B).
  - Emits local feature events (e.g., 'sub:moved', 'sub:damaged').

- SubmarineState.js
  - The "View Model" instance.
  - Logic: isOwnship(playerId), canMove(), isSurfaced().
  - Normalization: Extracts specific submarine data from the global state array.
  - Computed Properties: Formats raw data for display (e.g., health -> gauge levels).

- SubmarineFacade.js
  - Safe, immutable interface for Scene Controllers.
  - Primary API: getOwnship(), getEnemyStatus(), subscribe().

Integration:
- Controllers → Query facade for "Facts" (e.g., "Am I in MOVED state?").
- Map Feature → Subscribes to SubmarineState events to update position icons.
- UI Behaviors → Never access this directly; always routed via Controller.

Rules:
- Controllers should NOT parse raw socket state arrays.
- SubmarineState is responsible for identifying "Which sub is mine?" based on playerId.
- Features stay alive across scene changes; data is persistent.

4. Architectural Communication Flow (The Chain)

1. Server (Authority) → Broadcasts raw JSON snapshot via Socket.
2. socketManager (Transport) → Emits 'stateUpdate' event.
3. SubmarineFeature (Normalizer) → Hears 'stateUpdate', parses submarines[] array, updates internal SubmarineState objects.
4. SubmarineState (View Model) → Emits high-signal local event (e.g., 'sub:A:moved').
5. Scene Controller (Director) → Hears local event, asks View Model for computed data, instructs Map/UI.
6. UI Behaviors (Visuals) → Apply the change (render icon, move gauge).

Pause Button:
- src/behavior/pauseBehavior.js
  - Captures pause button press intent
  - Calls InterruptController.requestInterrupt(PAUSE)
  - Does NOT handle overlay display (that's in scene)
- connScene → mounts behavior
- Controller → routes to InterruptManager
- InterruptManager → transitions to out-of-game pause phase
- All players must ready-up via lobby to resume

Pause Overlay:
- src/feature/interrupt/InterruptOverlay.js (reusable)
- Mounted by scenes via controller subscription

Visual Effects:
- src/render/effects/ (all interrupt visuals)

Final Model:
- Behaviors → express intent
- Controllers → route & decide
- Features / Phase & Interrupt systems → execute logic
- Scenes → orchestrate lifecycle & render