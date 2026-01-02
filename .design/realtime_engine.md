REALTIME ENGINE

Top-level systems
1. Simulation Clock / Phase System
2. Global Interrupt System
3. Per-Submarine State Machine

"Pause" (manual UI button) is a global interrupt (#2)
"Surfacing" is per-submarine state (#3)

1. Simulation Clock / Phase System
Location: public/js/core/clock/

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
- core/sceneManager.js → uses gamePhaseManager for scene mounting
- controllers/* → check simulationClock.isRunning() before actions
- features/map/MapSystem.js → pauses updates via clock state

2. Global Interrupt System
Location: public/js/features/interrupts/

Purpose: Temporary global halt with auto-resume (torpedo resolution, sonar ping, pause, etc.)

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
  - TORPEDO_RESOLUTION
  - SONAR_PING
  - SCENARIO_ACTION
  - PAUSE
  - (GAME_OVER is a phase, not an interrupt)

- InterruptController.js
  - API for controllers to request interrupts
  - Translates intent → requestInterrupt()

- InterruptTimers.js
  - Duration, delays, auto-resume logic

Integration:
- socketManager → Controller → InterruptController → InterruptManager
- scenes/* → React visually to interrupt events via controller bridge
- core/uiEffects/ → Interrupt visuals (cinematics, overlays)

Rules:
- InterruptManager is the only mediator for halting/resuming simulationClock
- Pause is a manual interrupt (not a phase)
- No other feature/controller touches clock directly

3. Per-Submarine State Machine
Location: public/js/features/submarine/

Purpose: Per-submarine states (SURFACING, SUBMERGED, etc.)

Files:
- SubmarineStateMachine.js
  - Authoritative per-sub state
  - getState(), transitionTo(), canMove(), canFire(), etc.
  - Emits SUB_STATE_CHANGED, SUB_SURFACED, etc.
  - No PIXI, no UI, no sockets

- submarineStates.js
  - Enum + metadata for states

- submarineTransitions.js
  - Legal transition map

- surfacingRules.js
  - Pure rules (track erasure, reset conditions, etc.)

- surfacingController.js
  - Orchestrates surfacing flow
  - Requests transition via SubmarineStateMachine
  - Does NOT touch clock, interrupts, PIXI, or UI

- submarineEvents.js
  - Event names & payloads

- SubmarineFacade.js
  - Safe interface: canMove(), canFire(), subscribe/unsubscribe
  - Scenes/controllers import facade only

Integration:
- Controllers → query / request transitions via facade
- UI Behaviors → call controller handlers
- Scenes → react to events via controller bridge
- Interrupts → override via explicit contract only

Surfacing rules:
- Freezes only that sub (movement)
- Allows attacks, damage, broadcasts
- Pre-emptible by interrupts (e.g., torpedo hit, game over)

4. Architectural Flow (Critical)

Server → socketManager → Controller → Feature/System

UI Behavior → Controller → Feature/System

GamePhaseManager / InterruptManager → Controller → Scene/Behaviors

Pause Button:
- ui/behaviors/pauseBehavior.js
  - Captures intent
  - Calls InterruptManager.requestInterrupt(PAUSE)
  - Handles overlay display (visual only)
- connScene → mounts behavior & overlay
- Controller → routes intent, never pauses directly

Pause Overlay:
- features/pause/PauseOverlay.js (reusable)
- Mounted by scenes via controller subscription

Visual Effects:
- core/uiEffects/ (all interrupt visuals)

Final Model:
- Behaviors → express intent
- Controllers → route & decide
- Features / Phase & Interrupt systems → execute logic
- Scenes → orchestrate lifecycle & render