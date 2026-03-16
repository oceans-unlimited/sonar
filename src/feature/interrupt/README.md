# Interrupt Feature

The Interrupt feature is the central coordinator for all game-halting events. It owns the simulation clock lifecycle and provides a role-aware overlay system for displaying interrupt-specific UI to each player.

## Core Responsibilities

1. **Clock Control**: `InterruptManager` is the **only** system allowed to call `simulationClock.stop()` / `start()`. All clock-halting actions must route through it.
2. **Interrupt Lifecycle**: Manages the start → update → resolve → end cycle for global interrupts.
3. **Phase Coordination**: Transitions `gamePhaseManager` between `LIVE` and `INTERRUPT` phases.
4. **Role-Aware Overlay**: Renders interrupt-specific UI panels that vary by player role.

## Architecture

```
interrupt/
├── InterruptManager.js         // State owner: interrupt lifecycle + clock control
├── InterruptController.js      // Controller: API for requesting/resolving interrupts
├── InterruptOverlay.js         // View shell: lifecycle, scrim, mounts rendered content
├── interruptPanelRenderer.js   // Renderer: stateless panel builders per [type, role]
├── InterruptTypes.js           // Constants: canonical interrupt type enum
└── README.md
```

### Data Flow

Interrupts are **exclusively server-driven**. The `InterruptController` never calls `interruptManager` directly.

```
── Requesting an Interrupt (client → server) ──
Scene Controller → interruptController.requestPause()
    → socket.emit('request_pause') → Server validates → Server broadcasts state

── Interrupt Activation (server → client) ──
Server broadcasts state with { activeInterrupt: { type, payload } }
    → socketManager → SceneManager._setupStateSync()
    → interruptManager.requestInterrupt(type, payload)
        → simulationClock.stop()
        → gamePhaseManager.setPhase(INTERRUPT)
        → InterruptOverlay.show(interrupt)
            → interruptPanelRenderer.buildPanel(interrupt, role) → Container
            → wireButton() on interactive nodes

── Resolving an Interrupt (client → server → client) ──
Player clicks READY → interruptController.readyInterrupt()
    → socket.emit('ready_interrupt') → Server collects
    → Server removes activeInterrupt, broadcasts state
    → _setupStateSync() → interruptManager.resolveInterrupt()
```

### Component Roles

| File | Role | Rules |
|:---|:---|:---|
| `InterruptManager.js` | **State** | Owns `_activeInterrupt`. Only system that touches the clock. Emits lifecycle events. |
| `InterruptController.js` | **Controller** | Server-driven. Emits socket events only (`request_pause`, `ready_interrupt`, `submit_sonar_response`). Never calls `interruptManager` directly. |
| `InterruptOverlay.js` | **View Shell** | Lifecycle orchestrator. Subscribes to manager events. Delegates rendering to `interruptPanelRenderer`. Wires behaviors on rendered content. |
| `interruptPanelRenderer.js` | **Renderer** | Pure stateless functions. Returns PixiJS containers with labelled children. No events, no state. |
| `InterruptTypes.js` | **Constants** | Canonical enum for interrupt type strings. |

## Usage

### Mounting in a Scene

Scenes create the overlay and pass the local player's role:

```js
import { InterruptOverlay } from '../feature/interrupt/InterruptOverlay.js';

// In scene factory:
const interruptOverlay = new InterruptOverlay(ticker, 'co'); // role hint
sceneContent.addChild(interruptOverlay);
```

The overlay automatically subscribes to `interruptManager` events. No additional wiring is needed — `SceneManager` handles server state sync.

### Requesting an Interrupt (from a Controller)

Controllers express **intent** via socket events. They never trigger `interruptManager` directly.

```js
// Via the injected feature:
this.features.get('interrupt').requestPause();         // → socket.emit('request_pause')
this.features.get('interrupt').readyInterrupt();        // → socket.emit('ready_interrupt')
this.features.get('interrupt').submitSonarResponse({}); // → socket.emit('submit_sonar_response')
```

The server validates, updates state, broadcasts `activeInterrupt`, and `SceneManager._setupStateSync()` activates the interrupt client-side.

### Role-Specific Panel Resolution

`interruptPanelRenderer.buildPanel(interrupt, role)` resolves content using a lookup:

1. `type:role` key (e.g., `SONAR_PING:co`) → role-specific panel
2. `type` key (e.g., `SONAR_PING`) → type default panel
3. Fallback → generic boilerplate

Example: `SONAR_PING` with role `co` renders a Captain response form; all other roles see a "waiting" message with a READY button.

## Interrupt Types

| Type | Trigger | Manual Ready? |
|:---|:---|:---|
| `PAUSE` | Captain requests | Yes |
| `WEAPON_RESOLUTION` | Torpedo/mine impact | Yes |
| `SONAR_PING` | Active sonar fired | Yes (crew), Submit (Captain) |
| `START_POSITIONS` | Game beginning | Captain selects tile |
| `PLAYER_DISCONNECT` | Player drops connection | Yes |
| `SCENARIO_ACTION` | Scenario-specific event | No |

## Key Rules

- **Interrupts are server-driven**: `InterruptController` emits socket events only. It never calls `interruptManager.requestInterrupt()` directly. All interrupt state changes flow through `SceneManager._setupStateSync()`.
- **Clock control is exclusive**: No other feature or controller may call `simulationClock.stop()` or `start()`.
- **Renderer is stateless**: `interruptPanelRenderer.js` must never attach events, manage state, or call the server.
- **Overlay wires behaviors**: Button interactions are wired in `InterruptOverlay.js` after the renderer returns the container.
- **Server sync lives in SceneManager**: `SceneManager._setupStateSync()` bridges `state.activeInterrupt` to `interruptManager`. Scenes do not handle this.
